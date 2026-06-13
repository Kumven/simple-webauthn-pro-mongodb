const express = require('express')
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser")
const {generateAuthenticationOptions,generateRegistrationOptions, verifyRegistrationResponse, verifyAuthenticationResponse } =require("@simplewebauthn/server")
const base64url = require("base64url");

const { isoBase64URL } = require('@simplewebauthn/server/helpers')
const {
    getUserByMatricNo,
    createUser,getUserById
} = require("./../db-utils")
const Attendance = require("../models/Attendance");


const CLIENT_URL =  process.env.CLIENT_URL
const RP_NAME = process.env.RP_NAME
const RP_ID = process.env.RP_ID

const router = express.Router()
router.use(cookieParser())


router.post('/is-student', async (req, res) => {
    try{
        const matric_no = req.body.matric_no
        let student = await getUserByMatricNo(matric_no)
        console.log('student ',student)
        if (student){
            return res.status(200).json({ exists: true})}
        else{
            return res.status(200).json({ exists: false})
        }
    }
    catch(err){
        console.log('is-student error: ', err)
        res.status(400).json({ error: 'Server error' })
    }
})


router.post('/init-reg', async (req, res) => {
    try {
        const student_name = req.body.student_name
        const matric_no = req.body.matric_no
        console.log(matric_no, ' matric_no, student_name ', student_name)

        let student = await getUserByMatricNo(matric_no)
        if (student) return res.status(400).json({ exists: true,student_name:student.student_name})

        const opts = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userName: matric_no,
            userDisplayName: student_name,
            attestationType:'direct',

            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'preferred',
                requireResidentKey: true
              },
            
        })
        
        // Storing Information From Request
        res.cookie('regInfo',JSON.stringify({
            matric_no, 
            userId: opts.user.id,
            challenge: opts.challenge
        }), {httpOnly: true, maxAge: 50*1000, secure: true}
        )


        
        console.log('-----------------------------------')
        console.log('opts ',opts)
        res.json(opts)
    } catch (err) {
        console.log('signup error: ', err)
        res.status(400).json({ error: 'Server error' })
    }
})

router.post('/verify-reg', async (req, res) => {

    console.log(req.cookies, ' req.cookies')
    const regInfo = JSON.parse(req.cookies.regInfo)
    if (!regInfo) {
        return res.status(400).json({ error: "Authentication info not found" })
    }
        
    const body = req.body
    try{
        const verification = await verifyRegistrationResponse({
            response: body.registationJSON,
            expectedChallenge: regInfo.challenge,
            expectedOrigin: CLIENT_URL,
            expectedRPID: RP_ID,
        })
        console.log('verification ',verification)
       
const uint8Array = new Uint8Array(verification.registrationInfo.credential.publicKey);
  const buffer = Buffer.from(uint8Array);
        
        
        if (verification.verified) {
            const data_to_store = {
                id: verification.registrationInfo.credential.id,
                matric_no: req.body.matric_no,
                student_name: req.body.student_name,
                publicKey:  buffer,
                counter: verification.registrationInfo.credential.counter,
                deviceType: verification.registrationInfo.credentialDeviceType,
                backedUp: verification.registrationInfo.credentialBackedUp,
                transports:body.registationJSON.response.transports,

            }
            console.log('trying to store ',data_to_store)
            await createUser(
                data_to_store.id,
                data_to_store.matric_no,
                data_to_store.student_name, 
                passKey={
                publicKey:  data_to_store.publicKey,
                deviceType: data_to_store.deviceType||'singleDevice',
                backedUp: data_to_store.backedUp || false,
                transports: data_to_store.transports,

            })
            res.clearCookie("regInfo")

            // Save Student in a session cookie
             const token = jwt.sign({ id: data_to_store.id, username: data_to_store.student_name, matric_no:data_to_store.matric_no }, process.env.JWT_SECRET, { expiresIn: '1h' })
             res.cookie('userInfo', token, { httpOnly: true, secure: true, maxAge: 3600000 })
            res.json(data_to_store);
        }else{
            
            return res.status(400).json({ error: "Verification failed" })
        }


    }catch(err){
        console.log('verification error: ', err)
        res.status(400).json({ error: 'Server error' })
    }
})


router.post('/init-auth', async (req, res) => {
    try {
        const matric_no = req.body.matric_no
        console.log(matric_no, ' matric_no')
        let student = await getUserByMatricNo(matric_no)
        console.log('student---| ',student)
        if (!student) return res.status(400).json({ exists: false })
            
        const opts = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: [
                {
                    id: student.id,
                    type: 'public-key',
                    transports: student.passKey.transports
                }
            ]
        })
        console.log('What\'s in opts-------------| ',opts)
        

        res.cookie('authInfo',JSON.stringify({
            matric_no, 
            userId: student.id,
            challenge: opts.challenge
        }), {httpOnly: true, maxAge: 50*1000, secure: true}
        )

        res.json(opts)
    } catch (err) {
        console.log('login error: ', err)
        res.status(500).json({ error: 'Server error' })
    }
})


function bufferToUint8Array(buffer) {
    return new Uint8Array(buffer);
}

router.post('/verify-auth', async (req, res) => {
    const authInfo = JSON.parse(req.cookies.authInfo)
    if (!authInfo) {
        return res.status(400).json({ error: "Authentication info not found" })
      }
    
    const body = req.body
    const matric_no = body.matric_no
    console.log('-------------------------------')
    
    const student = await getUserById(authInfo.userId)
    console.log('student-----| ', student)
    console.log('project test ', student.matric_no, '||',matric_no)
    // if student exists ||| student id === the id frm request and thumbprint public key matches with matric no
    if ( !student){
        return res.status(400).json({ error: "Invalid Student - Doesn't Exist" })
    }else if(student.id != body.authJSON.id && student.matric_no != matric_no){
        return res.status(400).json({ error: "Verification Failed" })
    }
    console.log('-------------------------------')
    try{
        const backToUint8Array = bufferToUint8Array(student.passKey.publicKey);
        const verification = await verifyAuthenticationResponse({
            response: body.authJSON,
            expectedChallenge: authInfo.challenge,
            expectedOrigin: CLIENT_URL,
            expectedRPID: RP_ID,
            credential: {
                id: student.id,
                publicKey:  backToUint8Array,
                counter: student.passKey.counter,
                transports: student.passKey.transports
            }
        })
    

        if (verification.verified) {
            // Store Student in DB
            const data_to_store = {
                id: verification.authenticationInfo.credentialID,
                matric_no,
                student_name: req.body.student_name,
                publicKey: body.publicKey,
                counter: verification.authenticationInfo.newCounter,
                deviceType: verification.authenticationInfo.credentialDeviceType,
                backedUp: verification.authenticationInfo.credentialBackedUp,
                transports:body.authJSON.response.transports,

            }
            //updateUserCounter(student.id,verification.authenticationInfo.newCounter)
            console.log('-------------------------------')
            console.log(data_to_store, ' data_to_store')
            console.log('-------------------------------')
            console.log(await getUserByMatricNo(matric_no), ' getUserByMatricNo--')
            res.clearCookie("authInfo")
            
            // Save Student in a session cookie
            const token = jwt.sign({ id: student.id, username: student.student_name, matric_no }, process.env.JWT_SECRET, { expiresIn: '1h' })
            res.cookie('userInfo', token, { httpOnly: true, secure: true, maxAge: 3600000 }); // 1 hour
            return res.json(data_to_store);
        }else{
            return res.status(400).json({ error: "Verification failed" })
        }


    }catch(err){
        console.log('verification error: ', err)
        res.status(400).json({ error: 'Server error' })
    }
})

router.post("/logout", (req, res) => {
    res.clearCookie("userInfo", { httpOnly: true, secure: process.env.NODE_ENV === "production" });
    res.redirect("/login");
});

router.post('/mark-student', async (req, res) => {
const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD format
const matric_no = req.body.matric_no
  try {
    let attendance = await Attendance.findOne({ date: today });

    if (!attendance) {
      attendance = new Attendance({ date: today, students: [matric_no] });
    } else {
      if (!attendance.students.includes(matric_no)) {
        attendance.students.push(matric_no);
      } else {
        return { success: false, already_marked: true };
      }
    }

    await attendance.save();
    return res.json({ success: true,already_marked:false});
  } catch (error) {
      console.log(error)
      res.status(500).json( { success: false, msg: error.message })
  }
})

router.post('/admin-login', async (req, res) => {
    try {
      const { password } = req.body;
      
    //   const user = await User.findOne({ email });
      if (!password) return res.status(400).json({ error: 'Invalid credentials' });
      
      // Check password
        const ps = process.env.ADMIN_PS || 'admin'
      const isMatch = password === ps
      if (isMatch) {
        // Set cookie   
        res.cookie('authenticated', 'true',
            {httpOnly: true, maxAge: 50*1000, secure: true}
        )

        return res.json({ message: 'Login successful' });
      }
      return res.status(400).json({ error: 'Invalid credentials' });
    
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router
