const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    required: true,
    minlength: 10
  },
  symptoms: [String],
  diagnosis: String,
  prescription: String,
  notes: String,
  duration: {
    type: Number,
    default: 30,
    min: 15,
    max: 120
  },
  price: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
RecordSchema.index({ appointmentDate: 1 });
RecordSchema.index({ patientId: 1, appointmentDate: -1 });
RecordSchema.index({ status: 1 });

module.exports = mongoose.model('Record', RecordSchema);