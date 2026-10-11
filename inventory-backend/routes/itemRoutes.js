const express = require('express');
const router = express.Router();

const {
  getItems,
  getLowStockItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { createItemSchema, updateItemSchema } = require('../models/Item');

// All item routes require authentication
router.use(protect);

// Specific routes first
router.get('/low-stock', getLowStockItems);

// General collection routes
router
  .route('/')
  .get(getItems)
  .post(
    authorize('admin', 'manager'),
    validateRequest(createItemSchema),
    createItem
  );

// Single item routes
router
  .route('/:id')
  .get(getItemById)
  .put(
    authorize('admin', 'manager'),
    validateRequest(updateItemSchema),
    updateItem
  )
  .delete(authorize('admin'), deleteItem);

module.exports = router;