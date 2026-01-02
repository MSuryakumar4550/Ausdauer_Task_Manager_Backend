const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * ==================================================================================
 * AUSDAUER AUTH ENGINE - PROTECT MIDDLEWARE (VERSION 2.0.0)
 * ==================================================================================
 * SECURITY:
 * 1. TOKEN VALIDATION: Extracts and verifies JWT from Authorization header.
 * 2. IDENTITY ATTACHMENT: Loads full user profile (minus password) into req.user.
 * 3. DELETION SAFETY: Stops execution if the user was purged from the database.
 * ==================================================================================
 */

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (Format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password');

      // SAFETY CHECK: If user was deleted manually from DB, stop here to avoid crash
      if (!req.user) {
          return res.status(401).json({ message: 'Identity Expired: User no longer exists' });
      }

      // MULTI-COMMAND DEBUGGER: Log the role accessing the route
      // console.log(`[PROTECT] Access granted to: ${req.user.name} [Role: ${req.user.role}]`);

      next(); // Allow them to pass
    } catch (error) {
      console.log("[AUTH ERROR]", error.message);
      // Ensure execution stops on failure
      return res.status(401).json({ message: 'Security Alert: Authorization failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Security Alert: Missing transmission token' });
  }
};

module.exports = { protect };