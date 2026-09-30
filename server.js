const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. تفعيل CORS عشان Vercel يقدر يكلم السيرفر
app.use(cors());

// 2. السماح للسيرفر بقراءة البيانات المرسلة
app.use(express.json());





// ==========================================
// 3. تفعيل المسارات (Routes)
// ==========================================
// مسار تسجيل الدخول والمصادقة
const authRoutes = require('./routes/auth'); 
app.use('/api/auth', authRoutes);

// مسار الكورسات
const courseRoutes = require('./routes/courses');
app.use('/api/courses', courseRoutes);

// مسار المحاضرات (تمت إضافته هنا لحل المشكلة)
const lectureRoutes = require('./routes/lectures');
app.use('/api/lectures', lectureRoutes);
// ==========================================


// مسار الحضور (Attendance)
const attendanceRoutes = require('./routes/attendance');
app.use('/api/attendance', attendanceRoutes);







// 4. راوت تجريبي للتأكد إن السيرفر شغال
app.get('/', (req, res) => {
    res.send('Logos Backend is Running Successfully!');
});

// 5. الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI; 
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// 6. تشغيل السيرفر على بورت Railway مع فتح الاتصال الخارجي (0.0.0.0)
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});