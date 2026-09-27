const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture'); // تأكد أن المسار مطابق لمكان مجلد models عندك

// 1. مسار إضافة محاضرة جديدة (Create - POST)
router.post('/', async (req, res) => {
    try {
        const { title, videoUrl, courseId } = req.body;

        // التحقق من وصول البيانات الأساسية
        if (!title || !videoUrl || !courseId) {
            return res.status(400).json({ message: 'الرجاء إدخال عنوان المحاضرة ورابط الفيديو' });
        }

        const newLecture = new Lecture({
            title,
            videoUrl,
            courseId
        });

        await newLecture.save();
        res.status(201).json({ message: 'تم إضافة المحاضرة بنجاح', lecture: newLecture });

    } catch (error) {
        console.error('خطأ في الإضافة:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر', error: error.message });
    }
});

// 2. مسار جلب محاضرات كورس معين (Read - GET)
router.get('/:courseId', async (req, res) => {
    try {
        const lectures = await Lecture.find({ courseId: req.params.courseId });
        res.status(200).json(lectures);
    } catch (error) {
        console.error('خطأ في الجلب:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر', error: error.message });
    }
});

// 3. مسار تعديل بيانات محاضرة (Update - PUT)
router.put('/:id', async (req, res) => {
    try {
        const { title, videoUrl } = req.body;
        
        // التحديث وإرجاع البيانات الجديدة (new: true)
        const updatedLecture = await Lecture.findByIdAndUpdate(
            req.params.id, 
            { title, videoUrl }, 
            { new: true } 
        );
        
        if (!updatedLecture) {
            return res.status(404).json({ message: 'المحاضرة غير موجودة' });
        }
        
        res.status(200).json({ message: 'تم التعديل بنجاح', lecture: updatedLecture });
    } catch (error) {
        console.error('خطأ في التعديل:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر', error: error.message });
    }
});

// 4. مسار حذف محاضرة (Delete - DELETE)
router.delete('/:id', async (req, res) => {
    try {
        const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);
        
        if (!deletedLecture) {
            return res.status(404).json({ message: 'المحاضرة غير موجودة' });
        }
        
        res.status(200).json({ message: 'تم حذف المحاضرة بنجاح' });
    } catch (error) {
        console.error('خطأ في الحذف:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر', error: error.message });
    }
});

module.exports = router;