// SERVER-SIDE CODE (Node.js with Express)
const express = require('express');
const session = require('express-session');
const { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { isoBase64URL } = require('@simplewebauthn/server/helpers');

const app = express();
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// In-memory credential storage (use a database in production)
const userCredentials = {};

// Configuration
const rpID = 'localhost'; // Use your domain in production
const rpName = 'Your App Name';
const origin = `http://${rpID}:3000`; // Use https in production

// Generate registration options
app.post('/api/register/options', (req, res) => {
  const userId = req.body.userId || 'user-' + Math.floor(Math.random() * 1000000);
  const username = req.body.username || 'user';
  
  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: username,
    // Specifically for fingerprint
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Use the device's built-in authenticator
      userVerification: 'required',        // Require fingerprint verification
      residentKey: 'required'              // For passwordless login
    },
    attestation: 'direct'
  });
  
  // Save challenge for verification
  req.session.currentChallenge = options.challenge;
  req.session.userId = userId;
  
  res.json(options);
});

// Verify registration
app.post('/api/register/verify', async (req, res) => {
  const userId = req.session.userId;
  const expectedChallenge = req.session.currentChallenge;
  
  try {
    const verification = await verifyRegistrationResponse({
      credential: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });
    
    if (verification.verified) {
      const { credentialID, credentialPublicKey } = verification.registrationInfo;
      
      // Save user's credential for future authentication
      userCredentials[userId] = {
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey,
        counter: verification.registrationInfo.counter
      };
      
      res.json({ 
        verified: true,
        message: 'Fingerprint registered successfully!'
      });
    } else {
      res.status(400).json({ 
        verified: false,
        message: 'Verification failed' 
      });
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      verified: false,
      message: error.message 
    });
  }
});

// Generate authentication options
app.post('/api/login/options', (req, res) => {
  const userId = req.body.userId;
  
  // For a real implementation, you would look up the user's credentials
  const userCredential = userCredentials[userId];
  
  if (!userCredential) {
    return res.status(400).json({ error: 'User not registered' });
  }
  
  const options = generateAuthenticationOptions({
    rpID,
    allowCredentials: [{
      id: isoBase64URL.toBuffer(userCredential.credentialID),
      type: 'public-key',
    }],
    userVerification: 'required'
  });
  
  req.session.currentChallenge = options.challenge;
  req.session.userId = userId;
  
  res.json(options);
});

// Verify authentication
app.post('/api/login/verify', async (req, res) => {
  const userId = req.session.userId;
  const expectedChallenge = req.session.currentChallenge;
  
  try {
    const credential = userCredentials[userId];
    
    if (!credential) {
      return res.status(400).json({ error: 'User not registered' });
    }
    
    const verification = await verifyAuthenticationResponse({
      credential: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialPublicKey: credential.credentialPublicKey,
        credentialID: isoBase64URL.toBuffer(credential.credentialID),
        counter: credential.counter,
      }
    });
    
    if (verification.verified) {
      // Update the stored counter
      userCredentials[userId].counter = verification.authenticationInfo.newCounter;
      
      res.json({ 
        verified: true,
        message: 'Authentication successful!'
      });
    } else {
      res.status(400).json({ 
        verified: false,
        message: 'Authentication failed' 
      });
    }
  } catch (error) {
    console.error(error);
    res.status(400).json({ 
      verified: false,
      message: error.message 
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

// CLIENT-SIDE CODE (HTML + JavaScript)
// Save this to a file and serve it from your Express app
/*
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fingerprint Authentication</title>
  <script src="https://unpkg.com/@simplewebauthn/browser@7.2.0/dist/bundle/index.umd.js"></script>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    button { padding: 10px 15px; margin: 10px 0; cursor: pointer; }
    #status { margin: 20px 0; padding: 10px; background-color: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Fingerprint Authentication Demo</h1>
  
  <div>
    <h2>Registration</h2>
    <input type="text" id="username" placeholder="Username">
    <button id="register">Register Fingerprint</button>
  </div>
  
  <div>
    <h2>Authentication</h2>
    <button id="authenticate">Authenticate with Fingerprint</button>
  </div>
  
  <div id="status">Status: Ready</div>
  
  <script>
    // Get elements
    const registerBtn = document.getElementById('register');
    const authenticateBtn = document.getElementById('authenticate');
    const usernameInput = document.getElementById('username');
    const statusDiv = document.getElementById('status');
    
    // Store user ID
    let currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      currentUserId = 'user-' + Math.floor(Math.random() * 1000000);
      localStorage.setItem('userId', currentUserId);
    }
    
    // Update status
    function updateStatus(message, isError = false) {
      statusDiv.textContent = `Status: ${message}`;
      statusDiv.style.backgroundColor = isError ? '#ffdddd' : '#ddffdd';
    }
    
    // Register fingerprint
    registerBtn.addEventListener('click', async () => {
      const username = usernameInput.value || 'user';
      
      try {
        updateStatus('Starting registration...');
        
        // 1. Get registration options from server
        const optionsRes = await fetch('/api/register/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId, username })
        });
        
        if (!optionsRes.ok) {
          throw new Error('Failed to get registration options');
        }
        
        const options = await optionsRes.json();
        
        // 2. Use browser API to create credentials
        updateStatus('Please follow the prompts to register your fingerprint...');
        const attResp = await SimpleWebAuthnBrowser.startRegistration(options);
        
        // 3. Verify with server
        const verifyRes = await fetch('/api/register/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attResp)
        });
        
        const verificationJSON = await verifyRes.json();
        
        if (verificationJSON.verified) {
          updateStatus('Registration successful! You can now authenticate.');
        } else {
          updateStatus(`Registration failed: ${verificationJSON.message}`, true);
        }
      } catch (error) {
        console.error(error);
        updateStatus(`Error: ${error.message}`, true);
      }
    });
    
    // Authenticate with fingerprint
    authenticateBtn.addEventListener('click', async () => {
      try {
        updateStatus('Starting authentication...');
        
        // 1. Get authentication options from server
        const optionsRes = await fetch('/api/login/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId })
        });
        
        if (!optionsRes.ok) {
          const error = await optionsRes.json();
          throw new Error(error.error || 'Failed to get authentication options');
        }
        
        const options = await optionsRes.json();
        
        // 2. Use browser API to get assertion
        updateStatus('Please provide your fingerprint...');
        const assertionResponse = await SimpleWebAuthnBrowser.startAuthentication(options);
        
        // 3. Verify with server
        const verifyRes = await fetch('/api/login/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assertionResponse)
        });
        
        const verificationJSON = await verifyRes.json();
        
        if (verificationJSON.verified) {
          updateStatus('Authentication successful! You are now logged in.');
        } else {
          updateStatus(`Authentication failed: ${verificationJSON.message}`, true);
        }
      } catch (error) {
        console.error(error);
        updateStatus(`Error: ${error.message}`, true);
      }
    });
  </script>
</body>
</html>
*/