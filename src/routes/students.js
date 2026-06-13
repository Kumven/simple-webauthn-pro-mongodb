const express = require('express')
const cookieParser = require("cookie-parser")
const path = require('path')
const verifyToken = require('./../helper/basic')
const Attendance = require("../models/Attendance");


const router = express.Router();
router.use(cookieParser())

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/signup.html'));
})

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/pages/login.html'));
})



router.get('/dashboard', verifyToken, async (req, res) => {
  const user = req.user
  const today = new Date().toISOString().split("T")[0];

  let attendance = await Attendance.findOne({ date: today })

  const matric_no = user.matric_no
  let already_marked = attendance && attendance.students.includes(matric_no);

  res.render('dashboard', { username: user.username, matric_no, already_marked })
})


module.exports = router;
