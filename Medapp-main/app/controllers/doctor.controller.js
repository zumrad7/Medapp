const User = require('../models/user.model');
const Record = require('../models/record.model');

// Get all doctors
exports.getAllDoctors = async (req, res, next) => {
  try {
    const doctors = await User.find({ role: 'doctor' })
      .select('-password -__v')
      .sort({ createdAt: -1 });
    
    res.json(doctors);
  } catch (error) {
    next(error);
  }
};

// Get doctor by ID
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await User.findOne({ 
      _id: req.params.id, 
      role: 'doctor' 
    }).select('-password -__v');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // Get doctor's upcoming appointments
    const upcomingAppointments = await Record.find({
      doctorId: doctor._id,
      status: { $in: ['scheduled', 'confirmed'] },
      appointmentDate: { $gte: new Date() }
    })
    .populate('patientId', 'fullName email phone')
    .sort({ appointmentDate: 1 });
    
    res.json({
      ...doctor.toObject(),
      upcomingAppointments
    });
  } catch (error) {
    next(error);
  }
};

// Create doctor (admin only)
exports.createDoctor = async (req, res, next) => {
  try {
    const { username, email, password, fullName, phone, birthDate, specialization } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }
    
    const doctor = new User({
      username,
      email,
      password,
      fullName,
      phone,
      birthDate: new Date(birthDate),
      role: 'doctor',
      isVerified: true,
      specialization // custom field for doctors
    });
    
    await doctor.save();
    
    res.status(201).json({
      message: 'Doctor created successfully',
      doctor: {
        id: doctor._id,
        username: doctor.username,
        email: doctor.email,
        fullName: doctor.fullName,
        specialization: doctor.specialization,
        role: doctor.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update doctor (admin only)
exports.updateDoctor = async (req, res, next) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['fullName', 'phone', 'specialization', 'isVerified'];
    
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    const doctor = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'doctor' },
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({
      message: 'Doctor updated successfully',
      doctor
    });
  } catch (error) {
    next(error);
  }
};

// Delete doctor (admin only)
exports.deleteDoctor = async (req, res, next) => {
  try {
    // Check if doctor has upcoming appointments
    const upcomingAppointments = await Record.find({
      doctorId: req.params.id,
      status: { $in: ['scheduled', 'confirmed'] },
      appointmentDate: { $gte: new Date() }
    });
    
    if (upcomingAppointments.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete doctor with upcoming appointments'
      });
    }
    
    const doctor = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: 'doctor' 
    });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Search doctors
exports.searchDoctors = async (req, res, next) => {
  try {
    const { specialization, available } = req.query;
    const query = { role: 'doctor' };
    
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (available === 'true') {
      query.isVerified = true;
    }
    
    const doctors = await User.find(query)
      .select('-password -__v')
      .sort({ fullName: 1 });
    
    res.json(doctors);
  } catch (error) {
    next(error);
  }
};