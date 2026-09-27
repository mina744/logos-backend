const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
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

// توليد كود حضور للمحاضرة (أدمن)
router.post('/generate-code/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        const code = Math.floor(1000 + Math.random() * 9000).toString(); // كود 4 أرقام
        
        let attendance = await Attendance.findOne({ lectureId });
        if (!attendance) {
            attendance = new Attendance({ lectureId, attendanceCode: code, students: [] });
        } else {
            attendance.attendanceCode = code;
        }
        await attendance.save();
        res.status(200).json({ message: 'تم توليد الكود بنجاح', code });
    } catch (err) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// تسجيل الحضور للطالب بالكود
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { courseId, lectureId, code } = req.body;
        const studentId = req.user.userId;

        const attendance = await Attendance.findOne({ lectureId });
        if (!attendance || attendance.attendanceCode !== code) {
            return res.status(400).json({ message: 'كود الحضور غير صحيح' });
        }

        let studentRecord = attendance.students.find(s => s.studentId.toString() === studentId);
        if (studentRecord) {
            studentRecord.status = 'present';
        } else {
            attendance.students.push({ studentId, status: 'present' });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم تسجيل حضورك بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// تقرير الحضور للأدمن
router.get('/report/:courseId/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        const attendance = await Attendance.findOne({ lectureId }).populate('students.studentId', 'phone');
        
        const allStudents = await User.find({ role: 'student' }).select('phone');
        
        const report = allStudents.map(student => {
            const found = attendance ? attendance.students.find(s => s.studentId && s.studentId._id.toString() === student._id.toString()) : null;
            return {
                studentId: student._id,
                phone: student.phone,
                status: found ? found.status : 'absent'
            };
        });

        res.status(200).json({
            attendanceCode: attendance ? attendance.attendanceCode : null,
            report
        });
    } catch (err) {
        res.status(500).json({ message: 'خطأ في جلب التقرير' });
    }
});

// تسجيل يدوي من الأدمن
router.post('/manual-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, lectureId, action } = req.body;
        let attendance = await Attendance.findOne({ lectureId });
        
        if (!attendance) {
            attendance = new Attendance({ lectureId, students: [] });
        }

        let studentRecord = attendance.students.find(s => s.studentId.toString() === studentId);
        if (studentRecord) {
            studentRecord.status = action;
        } else {
            attendance.students.push({ studentId, status: action });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم التحديث يدوياً بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// إحصائيات الحضور والغياب للطالب الحالي
// إحصائيات الحضور والغياب الدقيقة للطالب الحالي
router.get('/student-stats', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.userId;
        
        // 1. جلب كل المحاضرات الموجودة في المنصة لحساب العدد الإجمالي
        const allLectures = await Lecture.find();
        const totalLecturesCount = allLectures.length;

        // 2. جلب سجلات حضور الطالب
        const attendanceRecords = await Attendance.find({ 'students.studentId': studentId });
        
        let presentCount = 0;
        attendanceRecords.forEach(record => {
            const studentRecord = record.students.find(s => s.studentId.toString() === studentId);
            if (studentRecord && studentRecord.status === 'present') {
                presentCount++;
            }
        });

        // المحاضرات التي غبت عنها هي الإجمالي ناقص ما حضره (ولا تقل عن صفر)
        let absentCount = Math.max(0, totalLecturesCount - presentCount);

        res.status(200).json({ presentCount, absentCount });
    } catch (error) {
        console.error('خطأ في جلب إحصائيات الحضور:', error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

module.exports = router;