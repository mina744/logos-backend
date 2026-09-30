const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }, // غير إجباري عشان الكورس العام
    attendanceCode: { type: String },
    students: [{
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['present', 'absent'], default: 'absent' }
    }]
});

module.exports = mongoose.model('Attendance', attendanceSchema);