const { User } = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new Admin workspace or a Staff/Manager joining an Admin's workspace
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'admin', adminEmail } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Case 1: Registering a brand-new Admin (Creates a separate, isolated workspace)
    if (role === 'admin') {
      const adminUser = new User({
        name,
        email,
        password,
        role: 'admin',
        isApproved: true,
      });
      adminUser.organizationId = adminUser._id;
      await adminUser.save();

      const token = generateToken(adminUser._id, adminUser.role);

      return res.status(201).json({
        success: true,
        message: 'Admin workspace created successfully',
        data: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          organizationId: adminUser.organizationId,
          isApproved: true,
          token,
        },
      });
    }

    // Case 2: Staff or Manager joining an existing Admin's workspace (Requires Admin approval)
    const targetAdmin = await User.findOne({
      email: adminEmail.toLowerCase(),
      role: 'admin',
    });

    if (!targetAdmin) {
      return res.status(404).json({
        success: false,
        message: `No Admin account found with email '${adminEmail}'. Please check with your Admin.`,
      });
    }

    const staffUser = await User.create({
      name,
      email,
      password,
      role,
      organizationId: targetAdmin.organizationId || targetAdmin._id,
      isApproved: false, // Must be approved by Admin before signing in
    });

    res.status(201).json({
      success: true,
      pendingApproval: true,
      message: 'Account request sent! You can sign in once your Admin approves your account.',
      data: {
        _id: staffUser._id,
        name: staffUser.name,
        email: staffUser.email,
        role: staffUser.role,
        isApproved: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your account is waiting for Admin approval. Please ask your Admin to authorize you.',
      });
    }

    // Backfill organizationId for any existing admin account created earlier
    if (!user.organizationId) {
      user.organizationId = user._id;
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isApproved: user.isApproved,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      organizationId: req.user.organizationId,
      isApproved: req.user.isApproved,
      createdAt: req.user.createdAt,
    },
  });
};

/**
 * @desc    List all users belonging ONLY to this Admin's workspace
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      organizationId: req.user.organizationId,
    }).sort({ isApproved: 1, createdAt: -1 }); // Pending users appear at the top

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or revoke a staff member in this Admin's workspace
 * @route   PATCH /api/auth/users/:id/approve
 * @access  Private/Admin
 */
const approveUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in your workspace',
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot modify your own approval status',
      });
    }

    user.isApproved = req.body.isApproved !== undefined ? Boolean(req.body.isApproved) : true;
    await user.save();

    res.status(200).json({
      success: true,
      message: user.isApproved ? `${user.name} has been approved` : `${user.name}'s access has been suspended`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove/Reject a user from this Admin's workspace
 * @route   DELETE /api/auth/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in your workspace',
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own Admin account',
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User removed from workspace',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a user's role within this Admin's workspace
 * @route   PATCH /api/auth/users/:id/role
 * @access  Private/Admin
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.user.organizationId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in your workspace',
      });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own admin role',
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getAllUsers,
  approveUser,
  deleteUser,
  updateUserRole,
};