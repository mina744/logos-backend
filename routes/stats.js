const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Lecture = require('../models/Lecture');
const { verifyAdmin } = require('../middleware/authMiddleware');

// جلب إحصائيات النظام (للأدمن)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const studentsCount = await User.countDocuments({ role: 'student' });
        const coursesCount = await Course.countDocuments();
        const lecturesCount = await Lecture.countDocuments();

        res.status(200).json({
            studentsCount,
            coursesCount,
            lecturesCount
        });
    } catch (error) {
        res.status(500).json({ message: 'حدث خطأ في جلب الإحصائيات' });
    }
});

module.exports = router;