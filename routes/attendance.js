const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

// 🚀 مسار تنظيف قاعدة البيانات
router.get('/fix-db', async (req, res) => {
    try {
        await mongoose.connection.collection('attendances').drop();
        res.status(200).json({ message: 'تم تنظيف قاعدة البيانات القديمة بنجاح! يمكنك تجربة التوليد الآن.' });
    } catch (err) {
        res.status(200).json({ message: 'الجدول نظيف مسبقاً.' });
    }
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'غير مصرح' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'توكن غير صالح' });
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

// توليد كود حضور للمحاضرة
router.post('/generate-code/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        const lecture = await Lecture.findById(lectureId);
        if (!lecture) return res.status(404).json({ message: 'المحاضرة غير موجودة' });

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        let attendance = await Attendance.findOne({ lectureId });
        if (!attendance) {
            attendance = new Attendance({ 
                lectureId: lectureId, 
                courseId: lecture.courseId, 
                attendanceCode: code, 
                students: [] 
            });
        } else {
            attendance.attendanceCode = code;
        }
        await attendance.save();
        res.status(200).json({ message: 'تم التوليد بنجاح', code });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// تسجيل الطالب بالكود
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { lectureId, code } = req.body;
        const studentId = req.user.userId;

        const attendance = await Attendance.findOne({ lectureId });
        if (!attendance || !attendance.attendanceCode) return res.status(400).json({ message: 'لم يتم إصدار كود بعد' });
        if (attendance.attendanceCode !== code.trim()) return res.status(400).json({ message: 'الكود غير صحيح' });

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord && studentRecord.status === 'present') {
            return res.status(400).json({ message: 'تم تسجيل حضورك مسبقاً!' });
        }

        if (studentRecord) studentRecord.status = 'present';
        else attendance.students.push({ studentId, status: 'present' });

        await attendance.save();
        res.status(200).json({ message: 'تم تسجيل حضورك بنجاح!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// تقرير الحضور للأدمن
router.get('/report/:courseId/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        let attendance = await Attendance.findOne({ lectureId }).populate('students.studentId', 'name phone');
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

        res.status(200).json({ attendanceCode: attendance ? attendance.attendanceCode : null, report });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// تسجيل يدوي
router.post('/manual-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, lectureId, action } = req.body;
        const lecture = await Lecture.findById(lectureId);
        
        let attendance = await Attendance.findOne({ lectureId });
        if (!attendance) {
            attendance = new Attendance({ lectureId, courseId: lecture.courseId, students: [] });
        }

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord) studentRecord.status = action;
        else attendance.students.push({ studentId, status: action });

        await attendance.save();
        res.status(200).json({ message: 'تم التحديث بنجاح' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;