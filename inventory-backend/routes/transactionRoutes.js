const express = require('express');
const router = express.Router();

const {
  recordStockMovement,
  getTransactions,
  getItemTransactions,
} = require('../controllers/transactionController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createStockTransactionSchema } = require('../models/Transaction');

// All transaction routes require authentication
router.use(protect);

// Global audit log (Managers and Admins)
router.get('/', authorize('admin', 'manager'), getTransactions);

// Item-specific routes
router.get('/item/:itemId', getItemTransactions);
router.post(
  '/item/:itemId',
  validateRequest(createStockTransactionSchema),
  recordStockMovement
);

module.exports = router;