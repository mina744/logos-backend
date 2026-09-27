const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    lectureId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lecture',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    },
    attendanceCode: {
        type: String
    },
    students: [
        {
            studentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            status: {
                type: String,
                enum: ['present', 'absent'],
                default: 'absent'
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);