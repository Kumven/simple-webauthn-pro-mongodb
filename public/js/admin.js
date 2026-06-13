
async function loginAdmin(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('/api/authn/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      console.log(data);
    //   // Save token to localStorage
    //   localStorage.setItem('authToken', data.token);
    //   localStorage.setItem('userData', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/admin-dashboard';
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
document.querySelector('form').addEventListener('submit', loginAdmin);