const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const User = require('../models/user.model');

const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers['authorization'];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token.replace('Bearer ', ''), config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = decoded.id;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role === 'admin') {
      next();
      return;
    }
    res.status(403).json({ message: 'Require Admin Role' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const isDoctor = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user.role === 'doctor' || user.role === 'admin') {
      next();
      return;
    }
    res.status(403).json({ message: 'Require Doctor Role' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isDoctor
};