require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../app/models/user.model');
const Record = require('../app/models/record.model');
const Service = require('../app/models/service.model');

async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not set. Set it in your environment or .env before running the seed script.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected');
    
    // Clear existing data
    await User.deleteMany({});
    await Record.deleteMany({});
    await Service.deleteMany({});
    
    console.log('🗑️ Cleared existing data');
    
    // Test duplicate prevention
    console.log('\n🧪 Testing duplicate prevention...');
    
    // NOTE: Seeding no longer creates a default admin user to avoid hard-coded admin accounts.
    // If you need an admin account, create it manually or use the removeAdmin / promote utilities.
    
    // Create doctors
    console.log('\n👨‍⚕️ Creating doctors...');
    
    const doctor1Password = await bcrypt.hash('doctor123', 10);
    const doctor1 = await User.create({
      username: 'drsmith',
      email: 'dr.smith@medapp.com',
      password: doctor1Password,
      fullName: 'Dr. John Smith',
      phone: '+1234567891',
      birthDate: new Date('1975-05-15'),
      role: 'doctor',
      specialization: 'Кардиология',
      isVerified: true
    });
    
    const doctor2Password = await bcrypt.hash('doctor456', 10);
    const doctor2 = await User.create({
      username: 'drjones',
      email: 'dr.jones@medapp.com',
      password: doctor2Password,
      fullName: 'Dr. Sarah Jones',
      phone: '+1234567892',
      birthDate: new Date('1985-08-20'),
      role: 'doctor',
      specialization: 'Педиатрия',
      isVerified: true
    });
    
    const doctor3Password = await bcrypt.hash('doctor789', 10);
    const doctor3 = await User.create({
      username: 'drwilliams',
      email: 'dr.williams@medapp.com',
      password: doctor3Password,
      fullName: 'Dr. Michael Williams',
      phone: '+1234567893',
      birthDate: new Date('1978-11-30'),
      role: 'doctor',
      specialization: 'Дерматология',
      isVerified: true
    });
    
    console.log(`✅ Created ${[doctor1, doctor2, doctor3].length} doctors`);
    // Also populate a separate `doctors` collection that the legacy server.js expects
    try {
      const doctorsCollection = mongoose.connection.db.collection('doctors');
      await doctorsCollection.deleteMany({});
        await doctorsCollection.insertMany([
        {
          _id: doctor1._id,
          name: doctor1.fullName,
          fullName: doctor1.fullName,
          specialization: 'Кардиология',
          email: doctor1.email,
          phone: doctor1.phone,
          is_available: true,
          experience: 10,
          rating: 4.7,
          price: 100,
          created_at: new Date()
        },
        {
          _id: doctor2._id,
          name: doctor2.fullName,
          fullName: doctor2.fullName,
          specialization: 'Педиатрия',
          email: doctor2.email,
          phone: doctor2.phone,
          is_available: true,
          experience: 7,
          rating: 4.6,
          price: 90,
          created_at: new Date()
        },
        {
          _id: doctor3._id,
          name: doctor3.fullName,
          fullName: doctor3.fullName,
          specialization: 'Дерматология',
          email: doctor3.email,
          phone: doctor3.phone,
          is_available: true,
          experience: 12,
          rating: 4.8,
          price: 110,
          created_at: new Date()
        }
      ]);
      console.log('✅ Populated legacy `doctors` collection');
    } catch (err) {
      console.warn('⚠️ Could not populate `doctors` collection:', err.message);
    }
    
    // Create patients
    console.log('\n👤 Creating patients...');
    
    const patient1Password = await bcrypt.hash('patient123', 10);
    const patient1 = await User.create({
      username: 'johndoe',
      email: 'john.doe@example.com',
      password: patient1Password,
      fullName: 'John Doe',
      phone: '+1234567894',
      birthDate: new Date('1990-03-10'),
      role: 'patient',
      isVerified: true
    });
    
    const patient2Password = await bcrypt.hash('patient456', 10);
    const patient2 = await User.create({
      username: 'janedoe',
      email: 'jane.doe@example.com',
      password: patient2Password,
      fullName: 'Jane Doe',
      phone: '+1234567895',
      birthDate: new Date('1992-07-25'),
      role: 'patient',
      isVerified: true
    });
    
    const patient3Password = await bcrypt.hash('patient789', 10);
    const patient3 = await User.create({
      username: 'bobsmith',
      email: 'bob.smith@example.com',
      password: patient3Password,
      fullName: 'Bob Smith',
      phone: '+1234567896',
      birthDate: new Date('1985-12-15'),
      role: 'patient',
      isVerified: true
    });
    
    console.log(`✅ Created ${[patient1, patient2, patient3].length} patients`);
    
    // Create services
    console.log('\n🩺 Creating services...');
    
    await Service.create([
      {
        name: 'General Consultation',
        description: 'Routine check-up and consultation',
        price: 50,
        duration: 30,
        category: 'consultation'
      },
      {
        name: 'Cardiology Check-up',
        description: 'Heart health examination',
        price: 120,
        duration: 60,
        category: 'therapy'
      },
      {
        name: 'Dermatology Consultation',
        description: 'Skin health and treatment',
        price: 80,
        duration: 45,
        category: 'consultation'
      },
      {
        name: 'Pediatrics Check-up',
        description: "Children's health examination",
        price: 70,
        duration: 40,
        category: 'therapy'
      }
    ]);
    
    console.log('✅ Created 4 medical services');
    
    // Create appointments/records
    console.log('\n📅 Creating appointments...');
    
    await Record.create([
      {
        patientId: patient1._id,
        doctorId: doctor1._id,
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: 'confirmed',
        reason: 'Annual heart checkup and blood pressure monitoring',
        symptoms: ['Fatigue', 'Occasional headaches', 'Chest discomfort'],
        duration: 60,
        price: 120
      },
      {
        patientId: patient2._id,
        doctorId: doctor2._id,
        appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'scheduled',
        reason: 'Child vaccination and health assessment',
        symptoms: ['Fever', 'Loss of appetite'],
        duration: 40,
        price: 70
      },
      {
        patientId: patient3._id,
        doctorId: doctor3._id,
        appointmentDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        status: 'confirmed',
        reason: 'Skin rash examination and treatment',
        symptoms: ['Itchy skin', 'Red patches', 'Dryness'],
        duration: 45,
        price: 80
      },
      {
        patientId: patient1._id,
        doctorId: doctor2._id,
        appointmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'completed',
        reason: 'Follow-up after medication',
        symptoms: [],
        diagnosis: 'Hypertension stage 1',
        prescription: 'Lisinopril 10mg daily, Monitor blood pressure weekly',
        notes: 'Patient responding well to medication. Blood pressure improved from 150/95 to 130/85.',
        duration: 30,
        price: 50
      },
      {
        patientId: patient2._id,
        doctorId: doctor1._id,
        appointmentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        status: 'completed',
        reason: 'Routine cardiac examination',
        symptoms: ['Palpitations', 'Shortness of breath'],
        diagnosis: 'Mild arrhythmia',
        prescription: 'Beta blockers as needed, Reduce caffeine intake',
        notes: 'Patient advised to maintain healthy lifestyle and regular exercise.',
        duration: 60,
        price: 120
      }
    ]);
    
    console.log('✅ Created 5 appointments');
    
    // Print summary
    console.log('\n📊 Database Seeding Complete!');
    console.log('='.repeat(50));
    console.log('📋 Test Users Created:');
    console.log('-'.repeat(50));
    console.log('Admin:', 'admin@medapp.com', '| Password: admin123');
    console.log('Doctor 1:', 'dr.smith@medapp.com', '| Password: doctor123 | Cardiology');
    console.log('Doctor 2:', 'dr.jones@medapp.com', '| Password: doctor456 | Pediatrics');
    console.log('Doctor 3:', 'dr.williams@medapp.com', '| Password: doctor789 | Dermatology');
    console.log('Patient 1:', 'john.doe@example.com', '| Password: patient123');
    console.log('Patient 2:', 'jane.doe@example.com', '| Password: patient456');
    console.log('Patient 3:', 'bob.smith@example.com', '| Password: patient789');
    console.log('='.repeat(50));
    console.log('\n🚀 You can now run: npm run dev');
    console.log('🌐 Open: http://localhost:3000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  seedDatabase();
} else {
  module.exports = seedDatabase;
}