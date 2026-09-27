const express = require('express');
const router = express.Router();
const Lecture = require('../models/Lecture');
const Course = require('../models/Course');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

// Middleware للتحقق من التوكن
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

// 1. جلب محاضرات كورس معين
router.get('/:courseId', verifyToken, async (req, res) => {
    try {
        const lectures = await Lecture.find({ courseId: req.params.courseId });
        res.status(200).json(lectures);
    } catch (err) {
        console.error('خطأ في جلب المحاضرات:', err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. إضافة محاضرة جديدة لكورس معين
router.post('/:courseId', verifyAdmin, async (req, res) => {
    try {
        const { title, videoUrl } = req.body;
        const courseId = req.params.courseId; // جلب الـ ID من الرابط

        if (!title || !videoUrl) {
            return res.status(400).json({ message: 'العنوان ورابط الفيديو مطلوبان' });
        }

        // إنشاء المحاضرة وربطها بالكورس
        const newLecture = new Lecture({
            courseId: courseId,
            title,
            videoUrl
        });

        await newLecture.save();
        res.status(201).json({ message: 'تم إضافة المحاضرة بنجاح', lecture: newLecture });
    } catch (error) {
        console.error('خطأ في إضافة المحاضرة:', error);
        res.status(500).json({ message: error.message || 'حدث خطأ في السيرفر' });
    }
});

// 3. حذف محاضرة
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);
        if (!deletedLecture) {
            return res.status(404).json({ message: 'المحاضرة غير موجودة' });
        }
        res.status(200).json({ message: 'تم حذف المحاضرة بنجاح' });
    } catch (err) {
        console.error('خطأ في حذف المحاضرة:', err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;