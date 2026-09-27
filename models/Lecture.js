const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    title: { type: String, required: true },
    videoUrl: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    attendanceCode: { type: String, default: null } // الكود السري للحضور
});

module.exports = mongoose.model('Lecture', lectureSchema);