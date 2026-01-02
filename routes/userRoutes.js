const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getLeaderboard,
  updateUser,
  updateScore,
  deleteUser,
  resetScores,
  forgotPassword,
  verifyOTP 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

/**
 * ==================================================================================
 * AUSDAUER AUTH ROUTES (VERSION 3.8.0 - ADMIN SYNC FINAL)
 * ==================================================================================
 * PATCH LOG:
 * 1. METHOD SYNC: Changed reset-scores from POST to PUT to match Chair Terminal.
 * 2. VERIFY OTP: Public endpoint active for credential recovery.
 * 3. PERSONNEL MANAGEMENT: All Chair-specific commands require 'protect' middleware.
 * ==================================================================================
 */

// --- PUBLIC SECURITY ROUTES ---
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP); 

// --- PROTECTED PERSONNEL ROUTES (Require Token) ---
router.post('/', protect, upload.single('photo'), registerUser); 
router.get('/me', protect, getMe); 
router.get('/leaderboard', protect, getLeaderboard); 

// --- CHAIR SPECIFIC COMMANDS ---
// FIXED: Changed router.post to router.put to align with frontend api.put call
router.put('/reset-scores', protect, resetScores); 
router.put('/score/:id', protect, updateScore); 
router.delete('/:id', protect, deleteUser); 

// --- IDENTITY UPDATES ---
router.put('/:id', protect, upload.single('photo'), updateUser);

module.exports = router;