const express = require('express');
const router = express.Router();

const {
  getSuppliers,
  getSupplierDebtSummary,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplierController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  createSupplierSchema,
  updateSupplierSchema,
} = require('../models/Supplier');

router.use(protect);

router.get('/summary', getSupplierDebtSummary);

router
  .route('/')
  .get(getSuppliers)
  .post(
    authorize('admin', 'manager'),
    validateRequest(createSupplierSchema),
    createSupplier
  );

router
  .route('/:id')
  .get(getSupplierById)
  .put(
    authorize('admin', 'manager'),
    validateRequest(updateSupplierSchema),
    updateSupplier
  )
  .delete(authorize('admin'), deleteSupplier);

module.exports = router;