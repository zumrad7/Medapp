const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// Public routes
router.get('/', doctorController.getAllDoctors);
router.get('/search', doctorController.searchDoctors);
router.get('/:id', doctorController.getDoctorById);

// Protected routes (admin only)
router.post('/', verifyToken, isAdmin, doctorController.createDoctor);
router.put('/:id', verifyToken, isAdmin, doctorController.updateDoctor);
router.delete('/:id', verifyToken, isAdmin, doctorController.deleteDoctor);

module.exports = router;