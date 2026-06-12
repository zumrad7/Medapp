const Record = require('../models/record.model');
const User = require('../models/user.model');

// Create new appointment
exports.createRecord = async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, reason, symptoms, duration, price } = req.body;
    
    // Check if doctor exists and is actually a doctor
    const doctor = await User.findOne({ 
      _id: doctorId, 
      role: 'doctor' 
    });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const record = new Record({
      patientId: req.userId,
      doctorId,
      appointmentDate: new Date(appointmentDate),
      reason,
      symptoms: symptoms || [],
      duration: duration || 30,
      price: price || 0,
      status: 'scheduled'
    });

    await record.save();

    // Populate doctor info for response
    await record.populate('doctorId', 'fullName email phone');

    res.status(201).json({
      message: 'Appointment created successfully',
      record
    });
  } catch (error) {
    next(error);
  }
};

// Get all appointments for logged in user
exports.getRecords = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    let query = {};

    if (user.role === 'patient') {
      query.patientId = req.userId;
    } else if (user.role === 'doctor') {
      query.doctorId = req.userId;
    }
    // Admin can see all

    const records = await Record.find(query)
      .populate('patientId', 'fullName email phone')
      .populate('doctorId', 'fullName email phone')
      .sort({ appointmentDate: -1 });

    res.json(records);
  } catch (error) {
    next(error);
  }
};

// Get single appointment
exports.getRecordById = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id)
      .populate('patientId', 'fullName email phone birthDate')
      .populate('doctorId', 'fullName email phone');

    if (!record) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const user = await User.findById(req.userId);
    if (user.role === 'patient' && record.patientId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (user.role === 'doctor' && record.doctorId._id.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
};

// Update appointment
exports.updateRecord = async (req, res, next) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['status', 'diagnosis', 'prescription', 'notes', 'price'];
    
    // Filter updates
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // If updating status, validate it
    if (filteredUpdates.status && !['scheduled', 'confirmed', 'completed', 'cancelled'].includes(filteredUpdates.status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const record = await Record.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const user = await User.findById(req.userId);
    if (user.role === 'patient') {
      // Patients can only cancel their own appointments
      if (record.patientId.toString() !== req.userId || 
          (Object.keys(filteredUpdates).length > 1 || filteredUpdates.status !== 'cancelled')) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).populate('patientId doctorId', 'fullName email phone');

    res.json({
      message: 'Appointment updated successfully',
      record: updatedRecord
    });
  } catch (error) {
    next(error);
  }
};

// Delete appointment
exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check permissions
    const user = await User.findById(req.userId);
    if (user.role === 'patient' && record.patientId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Record.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    next(error);
  }
};