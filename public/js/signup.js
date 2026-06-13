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
async function signUpfingerprint(e){
    e.preventDefault();
    let matric_no = document.querySelector('#matric').value
    let student_name = document.querySelector('#name').value
    addSpinner()
  
  displayHint('',true)
    try{
       
     try{if(localStorage.getItem('gc1fab_matric_no')){
            const is_stud_response = await fetch("/api/authn/is-student", 
                {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ "matric_no":localStorage.getItem('gc1fab_matric_no') }),
                credentials: "include"
            })
            const res_ = await is_stud_response.json()
            if(res_.exists && !res_.error){
                displayHint(`${localStorage.getItem('gc1fab_stuname') || localStorage.getItem('gc1fab_matric_no')} device already registered`, false)
                removeSpinner()
                return
            }else{
                localStorage.setItem('gc1fab_matric_no','')
                localStorage.setItem('gc1fab_stuname','')
            }
        }}
          catch(err){}
        
        // Get challenge from server, challenge is used to verify the response from the client
        const response = await fetch("/api/authn/init-reg", 
            {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matric_no,student_name }),
            credentials: "include"
        })
        // Parse JSON response
        const initResponse = await response.json()

        if(initResponse.error){
            displayHint('Connection Timeout', false)
            removeSpinner()
            return
        }
        
        else if(initResponse.exists){
            displayHint(`${initResponse.student_name} already registered`, true)
            removeSpinner()
            return
        }
        else if(initResponse.msg === 'xxx'){
            displayHint(JSON.stringify(initResponse), false)
            removeSpinner()
            return
        }

        // Create passkey
        let registationJSON;
        try{
            registationJSON =await startRegistration(initResponse)
        }catch(err){
            displayHint('This device is not supported authentication', false)
            removeSpinner()
            displayHint(err, false)
            return
        }
        
        console.log(registationJSON,'registationJSON var')
        
        // Save and verify passkey with server
        const verify_response = await fetch("/api/authn/verify-reg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({registationJSON, matric_no,student_name}),
            credentials: "include"
        })
        const verifyResponse = await verify_response.json();

        if(verifyResponse.error){
            displayHint('Connection Timeout', false)
            removeSpinner()
            // displayHint(JSON.stringify(initResponse))
            return
        }
        else if(verifyResponse.already_reg_device){
            displayHint(`${verifyResponse.student_name} device already registered`,false)
            removeSpinner()
            return
        }
        else{
            displayHint('Student Registered successfully', true)
          try{
            localStorage.setItem('gc1fab_matric_no',matric_no)
            localStorage.setItem('gc1fab_stuname',verifyResponse.student_name)
          }
          catch(err){}
            window.location.href = '/dashboard'
        }
        console.log(verifyResponse,'verification var')
            
        
    }
    catch(err){
    document.querySelector('#text').innerText = err;
        
    }
    removeSpinner()

}

document.querySelector('#signupBtn').addEventListener('click', signUpfingerprint);

