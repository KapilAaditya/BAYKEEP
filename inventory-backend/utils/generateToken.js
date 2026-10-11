const jwt = require('jsonwebtoken');

/**
 * Generate a signed JSON Web Token (JWT)
 * @param {string} id - The MongoDB User ID
 * @param {string} role - The user's role (admin, manager, staff)
 * @returns {string} Signed JWT token string
 */
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

module.exports = generateToken;