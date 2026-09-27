const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'logos_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'مطلوب توكن المصادقة، الوصول مرفوض' });
    }

    const token = authHeader.split(' ')[1]; // استخراج التوكن من "Bearer <token>"
    if (!token) {
        return res.status(401).json({ message: 'توكن غير صالح' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // بنخزن بيانات المستخدم (userId, role) جوه الطلب
        next();
    } catch (err) {
        return res.status(403).json({ message: 'التوكن منتهي الصلاحية أو غير صحيح' });
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ message: 'غير مسموح، هذه الصلاحية للمديرين فقط' });
        }
    });
};

module.exports = { verifyToken, verifyAdmin };