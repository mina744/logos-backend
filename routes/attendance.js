const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

// Middleware للتحقق من التوكن
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'غير مصرح، التوكن مفقود' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'التوكن غير صالح أو انتهت صلاحيته' });
        req.user = user;
        next();
    });
};

// Middleware للتحقق من الأدمن
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') next();
        else res.status(403).json({ message: 'غير مصرح، للأدمن فقط' });
    });
};

// 1. توليد كود حضور منفصل للكورس
router.post('/generate-course-code/:courseId', verifyAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        let attendance = await Attendance.findOne({ courseId, lectureId: { $exists: false } });
        if (!attendance) {
            attendance = new Attendance({ 
                courseId: courseId, 
                attendanceCode: code, 
                students: [] 
            });
        } else {
            attendance.attendanceCode = code;
        }
        await attendance.save();
        res.status(200).json({ message: 'تم توليد كود الحضور بنجاح', code });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. تسجيل الحضور للطالب بالكود المنفصل للكورس (مع منع تكرار التسجيل)
router.post('/record-course', verifyToken, async (req, res) => {
    try {
        const { courseId, code } = req.body;
        const studentId = req.user.userId;

        const attendance = await Attendance.findOne({ courseId, lectureId: { $exists: false } });
        if (!attendance || !attendance.attendanceCode) {
            return res.status(400).json({ message: 'لم يتم إصدار كود حضور لهذا الكورس بعد' });
        }

        if (attendance.attendanceCode !== code.trim()) {
            return res.status(400).json({ message: 'كود الحضور غير صحيح' });
        }

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        
        if (studentRecord && studentRecord.status === 'present') {
            return res.status(400).json({ message: 'لقد قمت بتسجيل حضورك مسبقاً لهذا الكورس!' });
        }

        if (studentRecord) {
            studentRecord.status = 'present';
        } else {
            attendance.students.push({ studentId, status: 'present' });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم تسجيل حضورك بنجاح!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. تقرير الحضور للأدمن للكورس
router.get('/course-report/:courseId', verifyAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;
        let attendance = await Attendance.findOne({ courseId, lectureId: { $exists: false } }).populate('students.studentId', 'name phone');
        const allStudents = await User.find({ role: 'student' }).select('name phone');
        
        const report = allStudents.map(student => {
            const found = attendance ? attendance.students.find(s => s.studentId && s.studentId._id.toString() === student._id.toString()) : null;
            return {
                studentId: student._id,
                name: student.name || 'طالب جديد',
                phone: student.phone,
                status: found ? found.status : 'absent'
            };
        });

        res.status(200).json({
            attendanceCode: attendance ? attendance.attendanceCode : null,
            report
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. تسجيل يدوي من الأدمن للكورس
router.post('/manual-course-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, courseId, action } = req.body;
        if (!studentId || !courseId || !action) return res.status(400).json({ message: 'البيانات ناقصة' });

        let attendance = await Attendance.findOne({ courseId, lectureId: { $exists: false } });
        if (!attendance) {
            attendance = new Attendance({ 
                courseId: courseId,
                students: [] 
            });
        }

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord) {
            studentRecord.status = action;
        } else {
            attendance.students.push({ studentId, status: action });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم التحديث بنجاح' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;