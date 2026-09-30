const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance'); // ضفنا الموديل ده عشان نمسح الحضور
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'غير مصرح، التوكن مفقود' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'التوكن غير صالح' });
        req.user = user;
        next();
    });
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') next();
        else res.status(403).json({ message: 'غير مصرح، للأدمن فقط' });
    });
};

// 1. جلب المحاضرات
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const lectures = await Lecture.find({ courseId: req.params.courseId }).sort({ createdAt: 1 });
        res.status(200).json(lectures);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. إضافة محاضرة (الفيديو اختياري)
router.post('/:courseId', verifyAdmin, async (req, res) => {
    try {
        const { title, videoUrl } = req.body;
        if (!title) return res.status(400).json({ message: 'عنوان المحاضرة مطلوب' });

        const newLecture = new Lecture({
            courseId: req.params.courseId,
            title,
            videoUrl: videoUrl || ''
        });

        await newLecture.save();
        res.status(201).json({ message: 'تم إضافة المحاضرة بنجاح', lecture: newLecture });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 3. تعديل المحاضرة (لإضافة الفيديو لاحقاً)
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const { title, videoUrl } = req.body;
        const updatedLecture = await Lecture.findByIdAndUpdate(
            req.params.id,
            { title, videoUrl: videoUrl || '' },
            { new: true }
        );
        if (!updatedLecture) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
        res.status(200).json({ message: 'تم التعديل بنجاح', lecture: updatedLecture });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 4. حذف المحاضرة (بتمسح الحضور معاها)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);
        if (!deletedLecture) return res.status(404).json({ message: 'المحاضرة غير موجودة' });
        
        // مسح كشف الحضور المرتبط بالمحاضرة دي عشان مايأثرش على الإحصائيات
        await Attendance.deleteOne({ lectureId: req.params.id });

        res.status(200).json({ message: 'تم حذف المحاضرة وكشف الحضور بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;