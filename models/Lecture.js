const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    videoUrl: {
        type: String,
        default: '' // اختياري عشان نقدر ننشئ الهيكل قبل الفيديو
    }
}, { timestamps: true });

module.exports = mongoose.model('Lecture', lectureSchema);