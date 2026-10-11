const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

/**
 * Middleware: Verify JWT and attach current user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header (Format: Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  try {
    // Verify token with secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database and attach to request (excluding password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token is invalid or expired.',
    });
  }
};

/**
 * Middleware: Restrict access to specified roles
 * @param  {...string} roles - e.g. 'admin', 'manager'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user ? req.user.role : 'unknown'}' is not authorized to access this route.`,
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};