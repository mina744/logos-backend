const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance'); // تم إضافة موديل الحضور
const { verifyAdmin, verifyToken } = require('../middleware/authMiddleware');

// 1. جلب كل الطلاب (للأدمن)
router.get('/students', verifyAdmin, async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).populate('enrolledCourses', 'title');
        res.status(200).json(students);
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 2. تفعيل كورس لطالب (للأدمن)
router.post('/enroll', verifyAdmin, async (req, res) => {
    try {
        const { phone, courseId } = req.body;
        const student = await User.findOne({ phone, role: 'student' });
        if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
        if (student.enrolledCourses.includes(courseId)) return res.status(400).json({ message: 'الطالب مشترك بالفعل' });

        student.enrolledCourses.push(courseId);
        await student.save(); 
        res.status(200).json({ message: 'تم تفعيل الكورس للطالب بنجاح' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 3. إعادة تعيين الباسورد لطالب (للأدمن)
router.put('/reset-password/:id', verifyAdmin, async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student) return res.status(404).json({ message: 'الطالب غير موجود' });
        
        student.password = student.phone; // جعل الباسورد هو رقم الهاتف
        await student.save(); // الـ Hook هيقوم بتشفيره تلقائياً
        res.status(200).json({ message: 'تم تصفير كلمة المرور لتكون رقم هاتف الطالب ✅' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 4. حذف طالب نهائياً (للأدمن)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const studentId = req.params.id;
        await Attendance.deleteMany({ student: studentId }); // تنظيف سجل غيابه
        await User.findByIdAndDelete(studentId); // مسح حسابه
        res.status(200).json({ message: 'تم حذف الطالب وجميع سجلاته بنجاح 🗑️' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 5. جلب بيانات المستخدم الشخصية (البروفايل)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).populate('enrolledCourses', 'title');
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
        
        // حساب إحصائيات حضور الطالب
        const userAttendance = await Attendance.find({ student: user._id, status: 'present' });
        const attendanceStats = {};
        userAttendance.forEach(record => {
            const cId = record.course.toString();
            attendanceStats[cId] = (attendanceStats[cId] || 0) + 1;
        });

        // دمج الكورسات مع عدد المحاضرات اللي حضرها
        const coursesWithStats = user.enrolledCourses.map(course => ({
            _id: course._id,
            title: course.title,
            attendedLectures: attendanceStats[course._id.toString()] || 0
        }));

        res.status(200).json({
            name: user.name, phone: user.phone, role: user.role,
            profilePicture: user.profilePicture, enrolledCourses: coursesWithStats
        });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 6. تحديث الاسم والصورة الشخصية
router.put('/update-profile', verifyToken, async (req, res) => {
    try {
        const { name, profilePicture } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
        if (name) user.name = name;
        if (profilePicture) user.profilePicture = profilePicture;
        await user.save();
        res.status(200).json({ message: 'تم تحديث البيانات الشخصية بنجاح ✅' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

// 7. تغيير كلمة المرور
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
        user.password = newPassword;
        await user.save();
        res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح ✅' });
    } catch (error) { res.status(500).json({ message: 'حدث خطأ في السيرفر' }); }
});

module.exports = router;