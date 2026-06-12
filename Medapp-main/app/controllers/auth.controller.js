const jwt = require('jsonwebtoken');
const config = require('../config/auth.config');
const User = require('../models/user.model');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, fullName, phone, birthDate, role } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !fullName || !phone || !birthDate) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Check password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({ 
        message: `User with this ${field} already exists`,
        field: field
      });
    }

    // Validate birth date (must be at least 18 years old)
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    if (age < 18) {
      return res.status(400).json({ 
        message: 'You must be at least 18 years old to register' 
      });
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      fullName,
      phone,
      birthDate: birthDateObj,
      role: role || 'patient'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      role: user.role 
    }, config.secret, {
      expiresIn: config.jwtExpiration
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        birthDate: user.birthDate
      },
      token
    });
  } catch (error) {
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        message: `User with this ${field} already exists`,
        field: field
      });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Allow login by email or username for convenience
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ 
        message: 'Email/username and password are required' 
      });
    }

    // Build query: if email provided, match case-insensitive email; otherwise match username
    const query = {};
    if (email) query.email = email.toLowerCase();
    if (username) query.username = username;

    // Support either field using $or when both provided
    let user;
    if (email && username) {
      user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    } else {
      user = await User.findOne(query);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      role: user.role 
    }, config.secret, {
      expiresIn: config.jwtExpiration
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

// Check availability of username or email
exports.checkAvailability = async (req, res, next) => {
  try {
    const { username, email } = req.query;
    
    if (!username && !email) {
      return res.status(400).json({ 
        message: 'Username or email is required' 
      });
    }

    let query = {};
    if (username) query.username = username;
    if (email) query.email = email.toLowerCase();

    const existingUser = await User.findOne(query);
    
    if (existingUser) {
      const field = existingUser.username === username ? 'username' : 'email';
      return res.json({
        available: false,
        message: `${field} is already taken`,
        field: field
      });
    }

    res.json({
      available: true,
      message: 'Available'
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};