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

// 1. توليد كود حضور للمحاضرة
router.post('/generate-code/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        let attendance = await Attendance.findOne({ lectureId });
        if (!attendance) {
            attendance = new Attendance({ lectureId, attendanceCode: code, students: [] });
        } else {
            attendance.attendanceCode = code;
        }
        await attendance.save();
        res.status(200).json({ message: 'تم توليد الكود بنجاح', code });
    } catch (err) {
        console.error('خطأ في توليد الكود:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// 2. تسجيل الحضور للطالب بالكود
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { lectureId, code } = req.body;
        const studentId = req.user.userId;

        const attendance = await Attendance.findOne({ lectureId });
        if (!attendance || attendance.attendanceCode !== code) {
            return res.status(400).json({ message: 'كود الحضور غير صحيح' });
        }

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord) {
            studentRecord.status = 'present';
        } else {
            attendance.students.push({ studentId, status: 'present' });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم تسجيل حضورك بنجاح' });
    } catch (err) {
        console.error('خطأ في تسجيل الحضور:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// 3. تقرير الحضور للأدمن (مع دعم جلب الكورس آلياً)
router.get('/report/:courseId/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { lectureId } = req.params;
        let attendance = await Attendance.findOne({ lectureId }).populate('students.studentId', 'phone');
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
        console.error('خطأ في جلب التقرير:', err);
        res.status(500).json({ message: 'خطأ في جلب التقرير' });
    }
});

// 4. تسجيل يدوي من الأدمن
router.post('/manual-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, lectureId, action } = req.body;
        
        if (!studentId || !lectureId || !action) {
            return res.status(400).json({ message: 'جميع البيانات مطلوبة' });
        }

        let attendance = await Attendance.findOne({ lectureId });
        
        if (!attendance) {
            attendance = new Attendance({ lectureId, students: [] });
        }

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord) {
            studentRecord.status = action; // 'present' أو 'absent'
        } else {
            attendance.students.push({ studentId, status: action });
        }

        await attendance.save();
        res.status(200).json({ message: 'تم التحديث يدوياً بنجاح' });
    } catch (err) {
        console.error('خطأ في التسجيل اليدوي:', err);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

// 5. إحصائيات الحضور والغياب للطالب
router.get('/student-stats', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const allLectures = await Lecture.find();
        const totalLecturesCount = allLectures.length;

        const attendanceRecords = await Attendance.find({ 'students.studentId': studentId });
        
        let presentCount = 0;
        attendanceRecords.forEach(record => {
            const studentRecord = record.students.find(s => s.studentId && s.studentId.toString() === studentId);
            if (studentRecord && studentRecord.status === 'present') {
                presentCount++;
            }
        });

        let absentCount = Math.max(0, totalLecturesCount - presentCount);

        res.status(200).json({ presentCount, absentCount });
    } catch (error) {
        console.error('خطأ في إحصائيات الطالب:', error);
        res.status(500).json({ message: 'خطأ في السيرفر' });
    }
});

module.exports = router;