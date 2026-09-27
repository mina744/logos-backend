const express = require('express');
const router = express.Router();
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

// Middleware للتحقق من صلاحية الأدمن
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'غير مصرح، هذه الصلاحية للأدمن فقط' });
        }
    });
};

// 1. تسجيل حساب جديد
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
            password, 
            role: role || 'student' 
        });

        await newUser.save();
        res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 2. تسجيل الدخول
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

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
        }

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

// 3. مسار جلب بيانات الملف الشخصي للمستخدم الحالي
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('خطأ في جلب الملف الشخصي:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 4. مسار جلب كل المستخدمين (لإحصائيات الأدمن)
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 5. مسار تحديث البيانات الشخصية (الاسم ورقم الهاتف)
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { name, phone },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }
        res.status(200).json({ message: 'تم التحديث بنجاح', user: updatedUser });
    } catch (error) {
        console.error('خطأ في تحديث البروفايل:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

// 6. مسار تغيير كلمة المرور
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
        }

        user.password = newPassword; 
        await user.save();

        res.status(200).json({ message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
        console.error('خطأ في تغيير كلمة المرور:', error);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

module.exports = router;