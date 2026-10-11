const express = require('express');
const router = express.Router();

const {
  recordPayment,
  getSupplierPaymentHistory,
  getAllPayments,
} = require('../controllers/supplierPaymentController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createSupplierPaymentSchema } = require('../models/SupplierPayment');

router.use(protect);

router
  .route('/')
  .get(getAllPayments)
  .post(
    authorize('admin', 'manager'),
    validateRequest(createSupplierPaymentSchema),
    recordPayment
  );

// Dealer-specific installment history
router.get('/supplier/:supplierId', getSupplierPaymentHistory);

module.exports = router;