const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');
const checkRole = require('../middlewares/roleMiddleware');

// Protected routes - require authentication
router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);

// Admin only routes
router.get('/', verifyToken, checkRole('admin'), userController.getAllUsers);
router.put('/:userId/role', verifyToken, checkRole('admin'), userController.updateUserRole);

module.exports = router;