const path = require('path')
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser")
const User = require('../models/Student');
const Attendance = require("../models/Attendance");


const { getAllStudents } = require("./../db-utils")

const authMiddleware = (req, res, next) => {
  if (req.cookies.authenticated === 'true') {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};


function formatData(data) {
  let formatted_data=`
  <h1> Registered Students </h1>
  <table>
  <thead> <tr> <th> Name </th> <th> Matric No </th> </tr> </thead>`
  data.forEach((student) => {
    formatted_data += `<tr>
    <td>${student.name}</td>
    <td>${student.matric_no}</td></tr>
    `
  }
  )
  formatted_data += '</table>'
  return formatted_data
}
    

const router = express.Router();
router.use(cookieParser())

async function getAttendanceWithNames(students) {
  try {
    const attendanceRecords = await Attendance.find();

    // Create a map of matric_no -> student_name for quick lookup
    const studentMap = {};
    students.forEach(student => {
      studentMap[student.matric_no] = student.name;
    });

    // Format attendance records
    const attendanceData = {};
    attendanceRecords.forEach(record => {
      attendanceData[record.date] = record.students.map(matric => ({name:studentMap[matric],matric_no:matric}) );
    });

    return attendanceData;
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return {};
  }
}


router.get('/admin-dashboard', async (req, res) => {
// router.get('/admin-dashboard', authMiddleware, async (req, res) => {
  try {
    const studentsData = await getAllStudents();
    const attendance = await getAttendanceWithNames(studentsData)
    res.render('admin-dashboard',{students:studentsData,attendance})
  } catch (err) {
      console.error(err);
      res.status(500).redirect('/admin-login')
  }
  });

router.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/pages/admin.html'));
})

module.exports = router;
