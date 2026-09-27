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
// استدعاء ملف تسجيل الدخول (تأكد إن عندك مجلد اسمه routes جواه ملف اسمه auth.js)
const authRoutes = require('./routes/auth'); 
app.use('/api/auth', authRoutes);

// استدعاء ملف الكورسات (شيل علامتين // اللي في الأول لو عندك ملف اسمه courses.js)
// const courseRoutes = require('./routes/courses');
// app.use('/api/courses', courseRoutes);
// ==========================================

// 4. راوت تجريبي للتأكد إن السيرفر شغال
app.get('/', (req, res) => {
    res.send('Logos Backend is Running Successfully!');
});

// 5. الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI; // بيقرأ الرابط من ملف .env في Railway
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// 6. تشغيل السيرفر على بورت Railway
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});