const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// حماية الـ CORS
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'https://logos-center.vercel.app'],
    credentials: true
};
app.use(cors(corsOptions));

// حماية حجم البيانات المتبادلة
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// الاتصال بقاعدة البيانات MongoDB Atlas (تم إزالة الإعدادات القديمة غير المدعومة)
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log('Connected to MongoDB Atlas successfully ✅');
})
.catch((err) => {
    console.error('Database connection error ❌', err);
});

// المسارات الأساسية (Routes)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/lectures', require('./routes/lectures'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/users', require('./routes/users'));
app.use('/api/stats', require('./routes/stats'));

const PORT = process.env.PORT || 5000;
app.server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
});