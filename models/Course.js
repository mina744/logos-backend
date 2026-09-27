const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  // دي قائمة هتشيل أكواد الطلبة اللي في الكورس ده عشان نحمي الفيديوهات
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);