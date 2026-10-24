const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  approveUser,
  deleteUser,
  updateUserRole,
} = require('../controllers/authController');

const { protect, authorize } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  registerUserSchema,
  loginUserSchema,
  updateUserRoleSchema,
} = require('../models/User');

// Public Routes
router.post('/register', validateRequest(registerUserSchema), registerUser);
router.post('/login', validateRequest(loginUserSchema), loginUser);

// Private Routes
router.get('/me', protect, getMe);

// Admin-Only Workspace User Management Routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/approve', protect, authorize('admin'), approveUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.patch(
  '/users/:id/role',
  protect,
  authorize('admin'),
  validateRequest(updateUserRoleSchema),
  updateUserRole
);

module.exports = router;