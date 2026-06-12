const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path'); // Добавьте этот импорт
require('dotenv').config();

// ============ EMAIL TRANSPORTER ============
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============ RBAC ROLES ============
const ROLES = {
  PATIENT: 'patient',
  PREMIUM_PATIENT: 'premium_patient',
  DOCTOR: 'doctor',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// ============ EMAIL FUNCTIONS ============
async function sendWelcomeEmail(user) {
  try {
    const mailOptions = {
      from: `"MedApp Clinic" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Welcome to MedApp!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to MedApp Clinic!</h2>
          <p>Dear ${user.fullName},</p>
          <p>Thank you for registering with MedApp. Your account has been successfully created!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Account Details:</h3>
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
          </div>
          
          <p>You can now book appointments with our doctors.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', user.email);
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
  }
}

async function sendAppointmentEmail(appointment, patient, doctor) {
  try {
    const mailOptions = {
      from: `"MedApp Clinic" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: patient.email,
      subject: 'Appointment Confirmation - MedApp Clinic',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Appointment Confirmed!</h2>
          <p>Dear ${patient.fullName},</p>
          <p>Your appointment has been successfully scheduled.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Appointment Details:</h3>
            <p><strong>Doctor:</strong> Dr. ${doctor.name}</p>
            <p><strong>Specialization:</strong> ${doctor.specialization}</p>
            <p><strong>Date & Time:</strong> ${new Date(appointment.appointmentDate).toLocaleString()}</p>
            <p><strong>Reason:</strong> ${appointment.reason}</p>
            <p><strong>Status:</strong> ${appointment.status}</p>
          </div>
          
          <p>Please arrive 10 minutes before your scheduled time.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Appointment email sent to:', patient.email);
  } catch (error) {
    console.error('❌ Error sending appointment email:', error);
  }
}
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Используйте path.join

// ✅ ВАЖНО: Добавьте эти маршруты ДО API маршрутов
// Маршруты для HTML страниц
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/doctors', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'doctors.html'));
});

app.get('/appointments', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'appointments.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

app.get('/book', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'book.html'));
});

// MongoDB подключение
const MONGODB_URI = process.env.MONGODB_URI || null;
let db;

// Подключение к MongoDB
async function connectToDatabase() {
    try {
        // Provide explicit options for TLS and timeouts to improve Atlas compatibility
        const mongoOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            tls: true,
            serverSelectionTimeoutMS: 10000
        };

        // Ensure we have an URI
        if (!MONGODB_URI) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('MONGODB_URI is not set in environment. Set MONGODB_URI in your deployment configuration.');
            } else {
                // development fallback to local DB
                const devUri = 'mongodb://localhost:27017/medapp';
                console.log('MONGODB_URI not set — using development fallback:', devUri);
                await mongoose.connect(devUri, { useNewUrlParser: true, useUnifiedTopology: true });
                db = mongoose.connection.db;
                console.log('✅ Подключение к локальному MongoDB установлено (dev fallback)');
                return db;
            }
        }

        // Try primary (likely Atlas) connection first
        try {
            const client = await MongoClient.connect(MONGODB_URI, mongoOptions);
            db = client.db();
            console.log('✅ Подключение к MongoDB установлено (primary)');

            // Initialize Mongoose using same URI
            await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log('✅ Mongoose подключен (primary)');

            return db;
        } catch (primaryErr) {
            console.warn('⚠️ Primary MongoDB connection failed:', primaryErr && primaryErr.message);

            // In production do not attempt local fallback — fail fast with a clear message
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Cannot connect to MongoDB Atlas in production. Common causes: wrong MONGODB_URI, Atlas IP whitelist does not include this host, or network/DNS issues.');
                console.error('Primary error:', primaryErr);
                throw primaryErr;
            }

            // Attempt local fallback for development convenience
            const fallbackUri = 'mongodb://localhost:27017/medapp';
            try {
                console.log('🔁 Попытка подключения к локальному MongoDB:', fallbackUri);
                await mongoose.connect(fallbackUri, { useNewUrlParser: true, useUnifiedTopology: true });
                // Mongoose exposes the native DB via mongoose.connection.db
                db = mongoose.connection.db;
                console.log('✅ Подключение к локальному MongoDB установлено (fallback)');
                return db;
            } catch (fallbackErr) {
                console.error('❌ Локальное подключение также не удалось:', fallbackErr && fallbackErr.message);
                throw primaryErr; // rethrow the original primary error for visibility
            }
        }
    } catch (error) {
        console.error('❌ Ошибка подключения к MongoDB:', error);
        process.exit(1);
    }
}

// Модели Mongoose
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String },
    birthDate: { type: Date },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    specialization: { type: String }, // Для врачей
    createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
    doctorId: { type: String, required: true }, // Сохраняем как строку (ObjectId из коллекции doctors)
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentDate: { type: Date, required: true },
    reason: { type: String, required: true },
    symptoms: [{ type: String }],
    diagnosis: { type: String },
    prescription: { type: String },
    notes: { type: String },
    duration: { type: Number, default: 30 }, // в минутах
    status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled'], default: 'scheduled' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
// If the project also uses the Record model elsewhere, require it to support seeded data
let RecordModel;
try {
    RecordModel = require('./app/models/record.model');
} catch (e) {
    try {
        RecordModel = require('./app/models/record.model');
    } catch (err) {
        RecordModel = null;
    }
}

// Middleware для аутентификации
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Требуется авторизация' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ message: 'Пользователь не найден' });
        }
        
        req.user = { userId: user._id.toString(), role: user.role };
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ message: 'Неверный токен' });
    }
};

// Добавьте этот код ПОСЛЕ существующей функции auth
const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({ message: 'Пользователь не найден' });
            }
            
            // Проверяем, есть ли у пользователя нужная роль
            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ 
                    message: 'У вас нет прав для выполнения этого действия' 
                });
            }
            
            req.user = { 
                userId: user._id.toString(), 
                role: user.role,
                isPremium: user.isPremium 
            };
            next();
        } catch (error) {
            console.error('Auth error:', error);
            res.status(401).json({ message: 'Неверный токен' });
        }
    };
};
// Маршруты API
const router = express.Router();

// ==================== ДЕБАГ И ПРОВЕРКА ====================
router.get('/api/debug', async (req, res) => {
    try {
        const doctorsCount = await db.collection('doctors').countDocuments();
        const appointmentsCount = await Appointment.countDocuments();
        const usersCount = await User.countDocuments();
        
        res.json({
            status: 'ok',
            collections: {
                doctors: doctorsCount,
                appointments: appointmentsCount,
                users: usersCount
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: error.message 
        });
    }
});

// ==================== АУТЕНТИФИКАЦИЯ ====================
router.post('/api/auth/register', async (req, res) => {
    try {
        console.log('Регистрация нового пользователя:', req.body);
        
        let { username, email, password, fullName, phone, birthDate } = req.body;
        if (email) email = email.toLowerCase().trim();
        if (username) username = username.trim();
        
        // Проверка существования пользователя
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ 
                message: 'Пользователь с таким email или именем уже существует' 
            });
        }
        
        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создание пользователя
        const user = new User({
            username,
            email,
            password: hashedPassword,
            fullName,
            phone,
            birthDate,
            role: 'patient'
        });
        
        await user.save();
        
        // Создание JWT токена
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            message: 'Регистрация успешна',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                birthDate: user.birthDate
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            message: 'Ошибка при регистрации',
            error: error.message 
        });
    }
});
// В server.js добавить:
router.get('/api/admin/appointments', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  // Логика для админа
});

router.get('/api/doctor/appointments', auth, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Forbidden' });

        const doctorId = req.user.userId; // string

        // Try to get appointments from Record model (legacy seeding)
        let records = [];
        if (RecordModel) {
            records = await RecordModel.find({ doctorId: doctorId }).populate('patientId', 'fullName email phone').sort({ appointmentDate: -1 }).lean();
        }

        // Also check the Appointment collection used by server.js
        const appointments = await Appointment.find({ doctorId: doctorId }).sort({ appointmentDate: -1 }).lean();

        // Normalize both sources into a single list
        const normalizedFromRecords = (records || []).map(r => ({
            _id: r._id.toString(),
            patient: r.patientId ? { _id: r.patientId._id.toString(), fullName: r.patientId.fullName, email: r.patientId.email, phone: r.patientId.phone } : null,
            appointmentDate: r.appointmentDate,
            reason: r.reason,
            status: r.status,
            duration: r.duration,
            source: 'records'
        }));

        const normalizedFromAppointments = (appointments || []).map(a => ({
            _id: a._id.toString(),
            patient: a.patientId ? (typeof a.patientId === 'object' ? { _id: a.patientId._id ? a.patientId._id.toString() : a.patientId.toString(), fullName: a.patientId.fullName, email: a.patientId.email, phone: a.patientId.phone } : { _id: a.patientId.toString() }) : null,
            appointmentDate: a.appointmentDate,
            reason: a.reason,
            status: a.status,
            duration: a.duration,
            source: 'appointments'
        }));

        const merged = [...normalizedFromRecords, ...normalizedFromAppointments].sort((x, y) => new Date(y.appointmentDate) - new Date(x.appointmentDate));

        // If some appointments only have patient IDs (no details), fetch those users and merge details
        try {
            const missingPatientIds = merged
                .filter(a => a.patient && !a.patient.fullName && a.patient._id)
                .map(a => a.patient._id)
                .filter((v, i, arr) => arr.indexOf(v) === i);

            if (missingPatientIds.length > 0) {
                const objectIds = missingPatientIds.map(id => new mongoose.Types.ObjectId(id));
                const users = await User.find({ _id: { $in: objectIds } }).select('fullName email phone').lean();
                const usersMap = users.reduce((m, u) => { m[u._id.toString()] = u; return m; }, {});

                merged.forEach(a => {
                    if (a.patient && (!a.patient.fullName || !a.patient.email)) {
                        const info = usersMap[a.patient._id.toString()];
                        if (info) {
                            a.patient.fullName = info.fullName;
                            a.patient.email = info.email;
                            a.patient.phone = info.phone;
                        }
                    }
                });
            }
        } catch (err) {
            console.warn('⚠️ Could not populate missing patient details:', err.message);
        }

        res.json(merged);
    } catch (err) {
        console.error('Error fetching doctor appointments:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get patients list for a doctor
router.get('/api/doctor/patients', auth, async (req, res) => {
    try {
        if (req.user.role !== 'doctor') return res.status(403).json({ message: 'Forbidden' });

        const doctorId = req.user.userId;

        // Collect patient IDs from records and appointments
        const patientIdsSet = new Set();

        if (RecordModel) {
            const recs = await RecordModel.find({ doctorId: doctorId }).select('patientId').lean();
            recs.forEach(r => { if (r.patientId) patientIdsSet.add(r.patientId.toString()); });
        }

        const appts = await Appointment.find({ doctorId: doctorId }).select('patientId').lean();
        appts.forEach(a => { if (a.patientId) patientIdsSet.add(a.patientId.toString()); });

        const patientIds = Array.from(patientIdsSet).map(id => new mongoose.Types.ObjectId(id));

        const patients = await User.find({ _id: { $in: patientIds } }).select('fullName email phone').lean();

        res.json(patients);
    } catch (err) {
        console.error('Error fetching doctor patients:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.post('/api/auth/login', async (req, res) => {
    try {
            // Allow login by email or username and enforce role selection if provided
            const { email, username, password, role } = req.body; // role: 'admin' | 'doctor' | 'patient' | 'user'

            // Build query (support email or username)
            let user;
            if (email && username) {
                user = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }] });
            } else if (email) {
                user = await User.findOne({ email: email.toLowerCase().trim() });
            } else if (username) {
                user = await User.findOne({ username: username.trim() });
            }

            if (!user) {
                return res.status(401).json({ message: 'Неверный email/username или пароль' });
            }
        
        // Проверка пароля
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Неверный email или пароль' });
        }
        
        // Enforce role selection if provided
        if (role) {
            // Normalize role alias
            const requestedRole = role === 'user' ? 'patient' : role;

            // Admin: allow any user whose role is 'admin'
            if (requestedRole === 'admin') {
                if (user.role !== 'admin') {
                    return res.status(403).json({ message: 'Только аккаунты с ролью администратора могут войти как Admin' });
                }
            }

            // Doctor: allow only users who have role 'doctor' (seeded doctors are present)
            if (requestedRole === 'doctor') {
                if (user.role !== 'doctor') {
                    return res.status(403).json({ message: 'Только аккаунты врачей могут входить как Doctor' });
                }
                // additionally ensure the doctor's email is one of the existing doctor emails in DB
                const doctorEmails = (await User.find({ role: 'doctor' }).select('email')).map(d => d.email);
                if (!doctorEmails.includes(user.email)) {
                    return res.status(403).json({ message: 'Доступ разрешён только для зарегистрированных врачей' });
                }
            }
        }

        // Создание JWT токена
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                phone: user.phone,
                birthDate: user.birthDate
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Ошибка при входе',
            error: error.message 
        });
    }
});
// Lookup endpoint to help frontend auto-select role by identity
router.get('/api/auth/lookup', async (req, res) => {
    try {
        const identity = req.query.identity;
        if (!identity) return res.json({ exists: false });

        let user;
        if (identity.includes('@')) {
            user = await User.findOne({ email: identity });
        } else {
            user = await User.findOne({ username: identity });
        }

        if (!user) return res.json({ exists: false });

        res.json({ exists: true, role: user.role, email: user.email });
    } catch (err) {
        console.error('Lookup error:', err);
        res.status(500).json({ exists: false });
    }
});
// ==================== ВРАЧИ (из коллекции doctors) ====================
router.get('/api/doctors', async (req, res) => {
    try {
        console.log('📋 Запрос на получение врачей из коллекции doctors...');
        
        const doctors = await db.collection('doctors').find({}).toArray();
        
        console.log(`✅ Найдено ${doctors.length} врачей в коллекции doctors`);
        
        if (doctors.length === 0) {
            console.log('⚠️  В коллекции doctors нет записей!');
            return res.json([]);
        }
        
        // Преобразуем для фронтенда
        const formattedDoctors = doctors.map(doctor => ({
            _id: doctor._id.toString(),
            fullName: doctor.name || doctor.fullName || 'Неизвестный врач',
            specialization: doctor.specialization || 'Не указано',
            email: doctor.email || 'email@example.com',
            phone: doctor.phone || '+7 (999) 999-99-99',
            experience: doctor.experience || 0,
            education: doctor.education || 'Не указано',
            rating: doctor.rating || 0,
            photo: doctor.photo || '',
            is_available: doctor.is_available !== false,
            description: doctor.description || '',
            price: doctor.price || 0,
            languages: doctor.languages || [],
            createdAt: doctor.created_at || doctor.createdAt || new Date()
        }));
        
        res.json(formattedDoctors);
    } catch (error) {
        console.error('❌ Ошибка при получении врачей:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении списка врачей',
            error: error.message 
        });
    }
});

router.get('/api/doctors/:id', async (req, res) => {
    try {
        const doctor = await db.collection('doctors').findOne({ 
            _id: new ObjectId(req.params.id)
        });
        
        if (!doctor) {
            return res.status(404).json({ message: 'Врач не найден' });
        }
        
        // Форматируем для фронтенда
        const formattedDoctor = {
            _id: doctor._id.toString(),
            fullName: doctor.name || doctor.fullName || 'Неизвестный врач',
            specialization: doctor.specialization || 'Не указано',
            email: doctor.email || 'email@example.com',
            phone: doctor.phone || '+7 (999) 999-99-99',
            experience: doctor.experience || 0,
            education: doctor.education || 'Не указано',
            rating: doctor.rating || 0,
            photo: doctor.photo || '',
            is_available: doctor.is_available !== false,
            description: doctor.description || '',
            price: doctor.price || 0,
            languages: doctor.languages || [],
            createdAt: doctor.created_at || doctor.createdAt || new Date()
        };
        
        res.json(formattedDoctor);
    } catch (error) {
        console.error('❌ Ошибка при получении врача:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// ==================== ЗАПИСИ ====================
router.get('/api/appointments', auth, async (req, res) => {
    try {
        console.log('📅 Получение записей для пользователя:', req.user.userId);
        
        // Находим записи пользователя
        const appointments = await Appointment.find({ 
            patientId: req.user.userId 
        }).sort({ appointmentDate: -1 });
        
        console.log(`✅ Найдено ${appointments.length} записей`);
        
        // Получаем информацию о врачах для каждой записи
        const appointmentsWithDoctorInfo = await Promise.all(
            appointments.map(async (appointment) => {
                let doctorInfo = null;
                
                if (appointment.doctorId) {
                    try {
                        const doctor = await db.collection('doctors').findOne({
                            _id: new ObjectId(appointment.doctorId)
                        });
                        
                        if (doctor) {
                            doctorInfo = {
                                _id: doctor._id.toString(),
                                fullName: doctor.name || 'Неизвестный врач',
                                specialization: doctor.specialization || 'Не указано'
                            };
                        } else {
                            doctorInfo = {
                                _id: appointment.doctorId,
                                fullName: 'Врач не найден',
                                specialization: 'Неизвестно'
                            };
                        }
                    } catch (err) {
                        console.log('⚠️  Ошибка при получении данных врача:', err.message);
                        doctorInfo = {
                            _id: appointment.doctorId,
                            fullName: 'Ошибка загрузки',
                            specialization: 'Неизвестно'
                        };
                    }
                }
                
                // Получаем информацию о пациенте
                const patient = await User.findById(appointment.patientId)
                    .select('fullName email phone');
                
                return {
                    _id: appointment._id.toString(),
                    doctorId: doctorInfo,
                    patientId: patient ? {
                        _id: patient._id.toString(),
                        fullName: patient.fullName,
                        email: patient.email,
                        phone: patient.phone
                    } : null,
                    appointmentDate: appointment.appointmentDate,
                    reason: appointment.reason,
                    symptoms: appointment.symptoms || [],
                    diagnosis: appointment.diagnosis,
                    prescription: appointment.prescription,
                    notes: appointment.notes,
                    duration: appointment.duration || 30,
                    status: appointment.status,
                    createdAt: appointment.createdAt
                };
            })
        );
        
        res.json(appointmentsWithDoctorInfo);
    } catch (error) {
        console.error('❌ Ошибка при получении записей:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении записей',
            error: error.message 
        });
    }
});

router.post('/api/appointments', auth, async (req, res) => {
    try {
        const { doctorId, appointmentDate, reason, symptoms, duration } = req.body;
        
        console.log('📝 Создание записи:', { doctorId, appointmentDate, reason });
        
        // Проверяем, существует ли врач в коллекции doctors
        const doctor = await db.collection('doctors').findOne({
            _id: new ObjectId(doctorId)
        });
        
        if (!doctor) {
            return res.status(404).json({ message: 'Врач не найден' });
        }
        
        // Проверяем, доступен ли врач
        if (doctor.is_available === false) {
            return res.status(400).json({ message: 'Врач временно недоступен для записи' });
        }
        
        // Проверяем, не занято ли время
        const existingAppointment = await Appointment.findOne({
            doctorId: doctorId,
            appointmentDate: new Date(appointmentDate),
            status: { $ne: 'cancelled' }
        });
        
        if (existingAppointment) {
            return res.status(400).json({ message: 'Это время уже занято' });
        }
        
        // Создаем запись
        const appointment = new Appointment({
            doctorId: doctorId,
            patientId: req.user.userId,
            appointmentDate: new Date(appointmentDate),
            reason: reason,
            symptoms: symptoms ? symptoms.split(',').map(s => s.trim()) : [],
            duration: duration || 30,
            status: 'scheduled',
            createdAt: new Date()
        });
        
        await appointment.save();
        
        // Получаем информацию о враче для ответа
        const doctorInfo = {
            _id: doctor._id.toString(),
            fullName: doctor.name,
            specialization: doctor.specialization
        };
        
        // Получаем информацию о пациенте
        const patient = await User.findById(req.user.userId)
            .select('fullName email phone');
        
        const appointmentResponse = {
            _id: appointment._id.toString(),
            doctorId: doctorInfo,
            patientId: patient ? {
                _id: patient._id.toString(),
                fullName: patient.fullName,
                email: patient.email,
                phone: patient.phone
            } : null,
            appointmentDate: appointment.appointmentDate,
            reason: appointment.reason,
            symptoms: appointment.symptoms,
            duration: appointment.duration,
            status: appointment.status,
            createdAt: appointment.createdAt
        };
        
        res.status(201).json({
            message: 'Запись успешно создана',
            appointment: appointmentResponse
        });
    } catch (error) {
        console.error('❌ Ошибка при создании записи:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при создании записи',
            error: error.message 
        });
    }
});

// Update appointment (status changes, diagnosis, prescription, notes, price)
router.put('/api/appointments/:id', auth, async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['status', 'diagnosis', 'prescription', 'notes', 'price', 'appointmentDate', 'reason', 'symptoms', 'duration'];

        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) filteredUpdates[key] = updates[key];
        });

        // Validate status if provided
        if (filteredUpdates.status && !['scheduled', 'confirmed', 'completed', 'cancelled'].includes(filteredUpdates.status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const record = await Appointment.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Appointment not found' });

        // Check permissions
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(401).json({ message: 'User not found' });

        if (user.role === 'patient') {
            // Patients can only cancel their own appointments
            if (record.patientId.toString() !== req.user.userId || 
                (Object.keys(filteredUpdates).length > 1 || filteredUpdates.status !== 'cancelled')) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // Apply updates
        Object.keys(filteredUpdates).forEach(k => {
            record[k] = filteredUpdates[k];
        });

        await record.save();
        const populated = await Appointment.findById(record._id).populate('patientId doctorId', 'fullName email phone');

        res.json({ message: 'Appointment updated successfully', record: populated });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete appointment
router.delete('/api/appointments/:id', auth, async (req, res) => {
    try {
        const record = await Appointment.findById(req.params.id);
        if (!record) return res.status(404).json({ message: 'Appointment not found' });

        const user = await User.findById(req.user.userId);
        if (!user) return res.status(401).json({ message: 'User not found' });

        if (user.role === 'patient' && record.patientId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Appointment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
router.get('/api/users/profile', auth, async (req, res) => {
    try {
        console.log('👤 Получение профиля для пользователя:', req.user.userId);
        
        const user = await User.findById(req.user.userId)
            .select('-password -__v');
        
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }
        
        // Получаем статистику пользователя
        const appointmentsCount = await Appointment.countDocuments({ 
            patientId: req.user.userId 
        });
        
        const completedCount = await Appointment.countDocuments({ 
            patientId: req.user.userId,
            status: 'completed'
        });
        
        const upcomingCount = await Appointment.countDocuments({ 
            patientId: req.user.userId,
            appointmentDate: { $gt: new Date() },
            status: { $ne: 'cancelled' }
        });
        
        // Получаем уникальных врачей
        const appointments = await Appointment.find({ patientId: req.user.userId });
        const doctorIds = [...new Set(appointments.map(a => a.doctorId))];
        const uniqueDoctorsCount = doctorIds.length;
        
        const userWithStats = {
            ...user.toObject(),
            stats: {
                totalAppointments: appointmentsCount,
                completedAppointments: completedCount,
                upcomingAppointments: upcomingCount,
                doctorsVisited: uniqueDoctorsCount
            }
        };
        
        console.log('✅ Профиль загружен со статистикой');
        res.json(userWithStats);
    } catch (error) {
        console.error('❌ Ошибка при получении профиля:', error);
        res.status(500).json({ 
            message: 'Ошибка сервера при получении профиля',
            error: error.message 
        });
    }
});

// Подключаем маршруты API
app.use('/', router);

// ✅ ВАЖНО: Добавьте обработчик 404 в конце
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Запуск сервера
async function startServer() {
    await connectToDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`🌐 Доступные страницы:`);
        console.log(`   http://localhost:${PORT}/ - Главная`);
        console.log(`   http://localhost:${PORT}/register - Регистрация`);
        console.log(`   http://localhost:${PORT}/login - Вход`);
        console.log(`   http://localhost:${PORT}/dashboard - Панель управления`);
        console.log(`   http://localhost:${PORT}/doctors - Врачи`);
        console.log(`   http://localhost:${PORT}/appointments - Записи`);
        console.log(`   http://localhost:${PORT}/profile - Профиль`);
        console.log(`   http://localhost:${PORT}/book - Новая запись`);
    });
}

startServer();
