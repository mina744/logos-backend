const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 1. جلب كل الكورسات (الأدمن يشاهد كل الكورسات، والطالب يشاهد كورساته فقط)
router.get('/', verifyToken, async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'admin') {
            courses = await Course.find();
        } else {
            const user = await User.findById(req.user.userId).populate('enrolledCourses');
            if (user) {
                courses = user.enrolledCourses;
            } else {
                courses = [];
            }
        }
        res.status(200).json(courses);
    } catch (error) {
        console.error('خطأ في جلب الكورسات:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. جلب كورس واحد بواسطة الـ ID (مهم جداً لصفحة course.html)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ message: 'الكورس غير موجود' });
        }
        res.status(200).json(course);
    } catch (error) {
        console.error('خطأ في جلب تفاصيل الكورس:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 3. إنشاء كورس جديد (للأدمن فقط)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'اسم الكورس مطلوب' });
        }

        const newCourse = new Course({ title, description });
        await newCourse.save();
        
        res.status(201).json({ message: 'تم إنشاء الكورس بنجاح', course: newCourse });
    } catch (error) {
        console.error('خطأ في إنشاء الكورس:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 4. حذف كورس بالكامل مع كل ملحقاته (للأدمن فقط)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const courseId = req.params.id;

        await Attendance.deleteMany({ course: courseId });
        await Lecture.deleteMany({ courseId: courseId });
        const deletedCourse = await Course.findByIdAndDelete(courseId);
        
        if (!deletedCourse) {
            return res.status(404).json({ message: 'الكورس غير موجود' });
        }

        res.status(200).json({ message: 'تم حذف الكورس وجميع محاضراته وسجلات حضوره بنجاح' });
    } catch (error) {
        console.error('خطأ في حذف الكورس:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;