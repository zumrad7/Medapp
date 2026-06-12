const Service = require('../models/service.model');

// Get all services
exports.getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({ active: true })
      .sort({ name: 1 });
    
    res.json(services);
  } catch (error) {
    next(error);
  }
};

// Get service by ID
exports.getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    next(error);
  }
};

// Create service (admin only)
exports.createService = async (req, res, next) => {
  try {
    const { name, description, price, duration, category } = req.body;
    
    const service = new Service({
      name,
      description,
      price,
      duration,
      category,
      active: true
    });
    
    await service.save();
    
    res.status(201).json({
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    next(error);
  }
};

// Update service (admin only)
exports.updateService = async (req, res, next) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'description', 'price', 'duration', 'category', 'active'];
    
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    next(error);
  }
};

// Delete service (admin only)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    next(error);
  }
};