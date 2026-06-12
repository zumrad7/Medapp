const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { verifyToken, isAdmin } = require('../middlewares/authJwt');

// Public routes
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

// Protected routes (admin only)
router.post('/', verifyToken, isAdmin, serviceController.createService);
router.put('/:id', verifyToken, isAdmin, serviceController.updateService);
router.delete('/:id', verifyToken, isAdmin, serviceController.deleteService);

module.exports = router;