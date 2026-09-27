const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// سري للـ JWT (يُفضل وضعه في ملف .env لاحقاً)
const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

// 1. تسجيل حساب جديد (Student أو Admin)
router.post('/register', async (req, res) => {
    try {
        const { phone, password, role } = req.body;
        
        if (!phone || !password) {
            return res.status(400).json({ message: 'رقم الهاتف وكلمة المرور مطلوبان' });
        }

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: 'رقم الهاتف مسجل بالفعل' });
        }

        const newUser = new User({ 
            phone, 
            password, // الـ Schema هتشفر الباسورد أوتوماتيك
            role: role || 'student' 
        });

        await newUser.save();
        res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. تسجيل الدخول وإصدار JWT Token حقيقي
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ message: 'أدخل رقم الهاتف وكلمة المرور' });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(401).json({ message: 'رقم الهاتف غير مسجل' });
        }

        // مقارنة الباسورد المدخل بالباسورد المشفر في الداتا بيز
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }

        // إنتاج JWT Token حقيقي يحتوي على الـ id والـ role صالح لمدة يوم
        const token = jwt.sign(
            { userId: user._id, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({ 
            message: 'تم تسجيل الدخول بنجاح', 
            token, 
            role: user.role,
            userId: user._id 
        });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;