const User = require('../models/user.model');

const checkRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (roles.includes(user.role)) {
        next();
      } else {
        res.status(403).json({ 
          message: `Require one of these roles: ${roles.join(', ')}` 
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
};

module.exports = checkRole;