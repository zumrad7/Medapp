const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const recordController = require('../controllers/record.controller');
const { verifyToken } = require('../middlewares/authJwt');
const validateRequest = require('../middlewares/validateRequest');

// Validation rules
const recordValidation = [
  body('doctorId').notEmpty().withMessage('Doctor ID is required'),
  body('appointmentDate').isISO8601().withMessage('Please enter a valid date'),
  body('reason').isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
  body('duration').optional().isInt({ min: 15, max: 120 }).withMessage('Duration must be between 15-120 minutes'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  validateRequest
];

// All routes require authentication
router.use(verifyToken);

// CRUD operations
router.post('/', recordValidation, recordController.createRecord);
router.get('/', recordController.getRecords);
router.get('/:id', recordController.getRecordById);
router.put('/:id', recordController.updateRecord);
router.delete('/:id', recordController.deleteRecord);

module.exports = router;