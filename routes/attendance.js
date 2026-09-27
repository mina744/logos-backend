const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Lecture = require('../models/Lecture');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// 1. تسجيل الحضور (للطالب) - يتطلب الكود السري
router.post('/record', verifyToken, async (req, res) => {
    try {
        const { courseId, lectureId, code } = req.body;
        const studentId = req.user.userId;

        const lecture = await Lecture.findById(lectureId);
        if (!lecture.attendanceCode) {
            return res.status(400).json({ message: 'لم يتم تفعيل الحضور لهذه المحاضرة بعد.' });
        }
        if (lecture.attendanceCode !== code) {
            return res.status(400).json({ message: 'الكود غير صحيح! تأكد من الكود المكتوب على السبورة.' });
        }

        const existingAttendance = await Attendance.findOne({ student: studentId, lecture: lectureId });
        if (existingAttendance) {
            return res.status(400).json({ message: 'لقد قمت بتسجيل حضور هذه المحاضرة مسبقاً!' });
        }

        const attendance = new Attendance({ student: studentId, course: courseId, lecture: lectureId, status: 'present' });
        await attendance.save();
        res.status(201).json({ message: 'تم تسجيل حضورك بنجاح 🟢' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. تسجيل أو إلغاء حضور يدوياً (للأدمن)
router.post('/manual-record', verifyAdmin, async (req, res) => {
    try {
        const { studentId, courseId, lectureId, action } = req.body; // action: 'present' or 'absent'
        
        if (action === 'present') {
            const existing = await Attendance.findOne({ student: studentId, lecture: lectureId });
            if (!existing) {
                await new Attendance({ student: studentId, course: courseId, lecture: lectureId, status: 'present' }).save();
            }
        } else {
            await Attendance.findOneAndDelete({ student: studentId, lecture: lectureId });
        }
        res.status(200).json({ message: 'تم تحديث حالة الحضور يدوياً' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 3. إنشاء كود حضور جديد للمحاضرة (للأدمن)
router.post('/generate-code/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const code = Math.floor(1000 + Math.random() * 9000).toString(); // كود عشوائي من 4 أرقام
        await Lecture.findByIdAndUpdate(req.params.lectureId, { attendanceCode: code });
        res.status(200).json({ code, message: 'تم إنشاء الكود بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 4. تقرير الحضور المفصل
router.get('/report/:courseId/:lectureId', verifyAdmin, async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;
        const lecture = await Lecture.findById(lectureId);
        const students = await User.find({ role: 'student', enrolledCourses: courseId }).select('phone');
        const attendanceRecords = await Attendance.find({ lecture: lectureId });
        const presentStudentIds = attendanceRecords.map(a => a.student.toString());

        const report = students.map(student => ({
            studentId: student._id,
            phone: student.phone,
            status: presentStudentIds.includes(student._id.toString()) ? 'present' : 'absent'
        }));

        res.status(200).json({ attendanceCode: lecture.attendanceCode, report });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;