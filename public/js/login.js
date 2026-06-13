const { startRegistration,startAuthentication} = SimpleWebAuthnBrowser;
const backDropEle = document.querySelector('.cover')

function displayHint(hint, good) {

  const msgEle = document.querySelector('#text')
  msgEle.innerText = hint
  msgEle.classList.add(good ? 'good' : 'bad')
  
}


function removeSpinner(){
    backDropEle.classList.add('display-none')
}

function addSpinner(){
    backDropEle.classList.remove('display-none')
}
async function loginInWithfingerprint(e){
    e.preventDefault();
    matric_no = document.querySelector('#matric').value
    console.log(matric_no)
    addSpinner()
  displayHint('',true)
    try{
      try{
        if(localStorage.getItem('gc1fab_matric_no') && localStorage.getItem('gc1fab_matric_no') !== matric_no){
            const is_stud_response = await fetch("/api/authn/is-student", 
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "matric_no":localStorage.getItem('gc1fab_matric_no') }),
                credentials: "include"
            })
            const res_=await is_stud_response.json()
            if(res_.exists && !res_.error){
                displayHint(`${localStorage.getItem('gc1fab_stuname') || localStorage.getItem('gc1fab_matric_no')} device already registered`, false)
                removeSpinner()
                return
            }
        }
      }
      catch(err){}
        // Get challenge from server, challenge is used to verify the response from the client
        const response = await fetch("/api/authn/init-auth", 
            {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matric_no}),
            credentials: "include"
        })

        // Parse JSON response
        const initResponse = await response.json()

        if(initResponse.error){
            displayHint('Connection Timeout', false)
            removeSpinner()
           // displayHint('This device is not supported authentication')
            return
        }
        else if(initResponse.exists == false){
            displayHint('Student doesn\'t exists',false)
            removeSpinner()
            return
        }
        else if(initResponse.msg === 'xxx'){
            displayHint(JSON.stringify(initResponse), false)
            removeSpinner()
            return
        }

        console.log('Getting passkey')
        // Get passkey
        let authJSON;
        try{
            authJSON =await startAuthentication(initResponse)
        }
        catch(err){
            displayHint(err, false)//'This device is not supported authentication', false)
            removeSpinner()
            return
        }
        console.log(authJSON,'authJSON var')
        
        // Verify passkey with DB
        const verify_response = await fetch("/api/authn/verify-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({authJSON, matric_no}),
            credentials: "include"
        })
        const verifyResponse = await verify_response.json();

        if(verifyResponse.error){
            displayHint(verifyResponse.error, false)
            // displayHint('Connection Timeout', false)
            removeSpinner()
            // displayHint(JSON.stringify(initResponse))
            return
        }
        else{
            displayHint('Login Successful', true)
            window.location.href = '/dashboard'
            // redirect to dashboard page frm server with matric_no
        }
        console.log(verifyResponse,'verification var')
            
        
    }
    catch(err){
        
            displayHint(err, false)
    }
removeSpinner()
}

document.querySelector('#loginBtn').addEventListener('click', loginInWithfingerprint);
