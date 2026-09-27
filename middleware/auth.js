const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // استقبال التوكن من الهيدر
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'غير مصرح لك بالدخول، التوكن غير موجود' });

  try {
    // فك تشفير التوكن والتأكد من صحته
    const verified = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = verified; // إضافة بيانات المستخدم (الأدمن/الطالب) للطلب
    next(); // السماح بالمرور للخطوة التالية
  } catch (err) {
    res.status(400).json({ message: 'التوكن غير صحيح أو منتهي الصلاحية' });
  }
};