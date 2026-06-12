const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const recordRoutes = require('./record.routes');
const doctorRoutes = require('./doctor.routes');
const serviceRoutes = require('./service.routes');

// Health check with database status
router.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus];
    
    // Get some basic counts
    const User = require('../models/user.model');
    const Record = require('../models/record.model');
    
    const counts = {
      patients: await User.countDocuments({ role: 'patient' }),
      doctors: await User.countDocuments({ role: 'doctor' }),
      admins: await User.countDocuments({ role: 'admin' }),
      appointments: await Record.countDocuments()
    };
    
    res.json({
      status: 'ok',
      message: 'MedApp API is running',
      database: {
        connected: dbStatus === 1,
        status: dbStatusText,
        ...counts
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node: process.version
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

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/appointments', recordRoutes);
router.use('/doctors', doctorRoutes);
router.use('/services', serviceRoutes);

module.exports = router;