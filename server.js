const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. تفعيل CORS للسماح لـ Vercel بالاتصال بالسيرفر
app.use(cors());

// 2. السماح للسيرفر بقراءة البيانات المرسلة بصيغة JSON
app.use(express.json());

// ==========================================
// 👇 حط هنا مسارات الأكواد (Routes) بتاعتك 👇
// ==========================================
// مثال على استدعاء ملفات الـ routes لو إنت فاصلها:
// const authRoutes = require('./routes/auth');
// const courseRoutes = require('./routes/courses');
// app.use('/api/auth', authRoutes);
// app.use('/api/courses', courseRoutes);
// ==========================================
// 👆 ------------------------------------ 👆
// ==========================================

// راوت تجريبي للتأكد إن السيرفر شغال لما تفتحه من المتصفح
app.get('/', (req, res) => {
    res.send('Logos Backend is Running Successfully!');
});

// الاتصال بقاعدة البيانات (MongoDB) - تأكد من إضافة رابط قاعدة بياناتك الصحيح
const MONGO_URI = process.env.MONGO_URI || 'mongodb_url_here'; 
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// 3. استخدام بورت ديناميكي لـ Railway
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});

// تعليق إضافي لإجبار Railway على عمل Restart للاتصال بقاعدة البيانات بعد فتح الـ IP
// Trigger Server Restart - Connection Fix