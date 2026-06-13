const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  students: { type: [String], default: [] }
});

module.exports = mongoose.model("Attendance", attendanceSchema);