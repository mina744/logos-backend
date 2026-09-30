const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

router.get('/fix-db', async (req, res) => {
    try {
        await mongoose.connection.collection('attendances').drop();
        res.status(200).json({ message: 'تم تنظيف قاعدة البيانات القديمة بنجاح!' });
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

// 1. توليد كود
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

// 2. تسجيل الطالب
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { lectureId, code } = req.body;
        const studentId = req.user.userId;

        const attendance = await Attendance.findOne({ lectureId });
        if (!attendance || !attendance.attendanceCode) return res.status(400).json({ message: 'لم يتم إصدار كود بعد' });
        if (attendance.attendanceCode !== code.trim()) return res.status(400).json({ message: 'الكود غير صحيح' });

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord && studentRecord.status === 'present') return res.status(400).json({ message: 'تم تسجيل حضورك مسبقاً!' });

        if (studentRecord) studentRecord.status = 'present';
        else attendance.students.push({ studentId, status: 'present' });

        await attendance.save();
        res.status(200).json({ message: 'تم تسجيل حضورك بنجاح!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3. تقرير حضور لمحاضرة واحدة 
router.get('/report/:courseId/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;
        let attendance = await Attendance.findOne({ lectureId }).populate('students.studentId', 'name phone');
        const enrolledStudents = await User.find({ role: 'student', enrolledCourses: courseId }).select('name phone');
        
        const report = enrolledStudents.map(student => {
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

// 4. تحديث يدوي
router.post('/manual-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, lectureId, action } = req.body;
        const lecture = await Lecture.findById(lectureId);
        let attendance = await Attendance.findOne({ lectureId });
        if (!attendance) attendance = new Attendance({ lectureId, courseId: lecture.courseId, students: [] });

        let studentRecord = attendance.students.find(s => s.studentId && s.studentId.toString() === studentId);
        if (studentRecord) studentRecord.status = action;
        else attendance.students.push({ studentId, status: action });

        await attendance.save();
        res.status(200).json({ message: 'تم التحديث بنجاح' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 5. مسار التقرير المجمع للـ PDF 
router.get('/aggregate-report/:courseId', verifyAdmin, async (req, res) => {
    try {
        const { courseId } = req.params;
        const lectures = await Lecture.find({ courseId }).sort({ createdAt: 1 });
        const enrolledStudents = await User.find({ role: 'student', enrolledCourses: courseId }).select('name phone');
        const attendances = await Attendance.find({ courseId });

        const report = enrolledStudents.map(student => {
            let attendedLectures = [];
            let totalAttended = 0;

            lectures.forEach((lec) => {
                const lecAttendance = attendances.find(a => a.lectureId && a.lectureId.toString() === lec._id.toString());
                if (lecAttendance) {
                    const studentRecord = lecAttendance.students.find(s => s.studentId && s.studentId.toString() === student._id.toString());
                    if (studentRecord && studentRecord.status === 'present') {
                        attendedLectures.push(lec.title);
                        totalAttended++;
                    }
                }
            });

            return {
                name: student.name || 'طالب غير محدد',
                phone: student.phone,
                attendedLectures: attendedLectures.length > 0 ? attendedLectures.join(' ، ') : 'لم يحضر أي محاضرة',
                totalAttended
            };
        });

        res.status(200).json({ report, totalLectures: lectures.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 6. إحصائيات الطالب الشخصية (لصفحة الـ Profile)
router.get('/student-stats', verifyToken, async (req, res) => {
    try {
        const studentId = req.user.userId;
        const student = await User.findById(studentId);
        
        if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });

        const enrolledCourses = student.enrolledCourses || [];
        if (enrolledCourses.length === 0) return res.status(200).json({ presentCount: 0, absentCount: 0 });

        // التعديل: جلب المحاضرات الفعالة فقط اللي لسة موجودة في الكورسات المشترك فيها
        const activeLectures = await Lecture.find({ courseId: { $in: enrolledCourses } });
        const activeLectureIds = activeLectures.map(lec => lec._id);

        const totalLecturesCount = activeLectureIds.length;

        // حساب الحضور بس للمحاضرات اللي لسة موجودة
        const attendanceRecords = await Attendance.find({
            lectureId: { $in: activeLectureIds },
            'students': { $elemMatch: { studentId: studentId, status: 'present' } }
        });
        
        const presentCount = attendanceRecords.length;
        const absentCount = Math.max(0, totalLecturesCount - presentCount);

        res.status(200).json({ presentCount, absentCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;