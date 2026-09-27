const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Middleware للتحقق من التوكن (مضمن هنا لسهولة النسخ إذا لم تستخدم ملف منفصل)
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

// 1. جلب كل الكورسات (الأدمن يرى الجميع، الطالب يرى كورساته فقط)
router.get('/', verifyToken, async (req, res) => {
    try {
        let courses;
        if (req.user.role === 'admin') {
            courses = await Course.find();
        } else {
            const user = await User.findById(req.user.userId).populate('enrolledCourses');
            courses = user ? user.enrolledCourses : [];
        }
        res.status(200).json(courses);
    } catch (error) {
        console.error('خطأ في جلب الكورسات:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. جلب كورس واحد بواسطة الـ ID
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

// 4. اشتراك طالب في كورس معين (عن طريق رقم الهاتف للأدمن)
router.post('/:id/enroll', verifyAdmin, async (req, res) => {
    try {
        const { phone } = req.body;
        const courseId = req.params.id;

        if (!phone) return res.status(400).json({ message: 'رقم هاتف الطالب مطلوب' });

        const student = await User.findOne({ phone, role: 'student' });
        if (!student) return res.status(404).json({ message: 'لا يوجد طالب مسجل بهذا الرقم' });

        if (student.enrolledCourses.includes(courseId)) {
            return res.status(400).json({ message: 'الطالب مشترك في هذا الكورس بالفعل' });
        }

        student.enrolledCourses.push(courseId);
        await student.save();

        res.status(200).json({ message: 'تم إضافة الطالب للكورس بنجاح' });
    } catch (error) {
        console.error('خطأ في اشتراك الطالب:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 5. حذف كورس بالكامل مع كل ملحقاته (للأدمن فقط)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const courseId = req.params.id;

        await Attendance.deleteMany({ courseId: courseId });
        await Lecture.deleteMany({ courseId: courseId });
        const deletedCourse = await Course.findByIdAndDelete(courseId);
        
        if (!deletedCourse) {
            return res.status(404).json({ message: 'الكورس غير موجود' });
        }

        res.status(200).json({ message: 'تم حذف الكورس بنجاح' });
    } catch (error) {
        console.error('خطأ في حذف الكورس:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;