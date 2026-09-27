const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['present', 'absent'], default: 'present' }
});

// لمنع تسجيل حضور الطالب نفس المحاضرة مرتين
attendanceSchema.index({ student: 1, lecture: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);