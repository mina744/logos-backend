const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 1. جلب كل الكورسات (الأدمن بيشوف كل الكورسات، الطالب بيشوف الكورسات المشترك فيها بس)
router.get('/', verifyToken, async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'admin') {
            // الأدمن يشوف كل الكورسات
            courses = await Course.find();
        } else {
            // الطالب يشوف الكورسات اللي متسجلة في حسابه فقط
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

// 2. إنشاء كورس جديد (للأدمن فقط)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'اسم الكورس مطلوب' });
        }

        const newCourse = new Course({ title });
        await newCourse.save();
        
        res.status(201).json({ message: 'تم إنشاء الكورس بنجاح', course: newCourse });
    } catch (error) {
        console.error('خطأ في إنشاء الكورس:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 3. حذف كورس بالكامل مع كل ملحقاته (للأدمن فقط)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const courseId = req.params.id;

        // الخطوة 1: حذف كل سجلات الحضور المرتبطة بالكورس ده (عشان الداتا بيز تفضل نظيفة)
        await Attendance.deleteMany({ course: courseId });

        // الخطوة 2: حذف كل المحاضرات المرتبطة بالكورس ده
        await Lecture.deleteMany({ courseId: courseId });

        // الخطوة 3: أخيراً، حذف الكورس نفسه
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