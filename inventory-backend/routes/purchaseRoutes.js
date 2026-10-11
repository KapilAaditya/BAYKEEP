const express = require('express');
const router = express.Router();

const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  deletePurchase, // Imported
} = require('../controllers/purchaseController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createPurchaseSchema } = require('../models/Purchase');

router.use(protect);

router
  .route('/')
  .get(getPurchases)
  .post(
    authorize('admin', 'manager'),
    validateRequest(createPurchaseSchema),
    createPurchase
  );

router
  .route('/:id')
  .get(getPurchaseById)
  .delete(authorize('admin', 'manager'), deletePurchase); // Added delete route

module.exports = router;