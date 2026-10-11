const express = require('express');
const router = express.Router();

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('../models/Category');

// All category operations require login
router.use(protect);

router
  .route('/')
  .get(getCategories)
  .post(
    authorize('admin', 'manager'),
    validateRequest(createCategorySchema),
    createCategory
  );

router
  .route('/:id')
  .put(
    authorize('admin', 'manager'),
    validateRequest(updateCategorySchema),
    updateCategory
  )
  .delete(authorize('admin'), deleteCategory);

module.exports = router;