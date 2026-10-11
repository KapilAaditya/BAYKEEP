const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
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

// Private Routes (Requires valid token)
router.get('/me', protect, getMe);

// Admin-Only Routes
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch(
  '/users/:id/role',
  protect,
  authorize('admin'),
  validateRequest(updateUserRoleSchema),
  updateUserRole
);

module.exports = router;