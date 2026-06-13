const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  matric_no: { type: String, required: true, unique: true },
  student_name: { type: String, required: true },
  passKey: {
    publicKey: { type: Buffer, required: true },
    deviceType: { type: String, required: true },
    backedUp: { type: Boolean, required: true },
    transports: { type: Array, required: true }
  }
});

module.exports = mongoose.model('Student', studentSchema);
