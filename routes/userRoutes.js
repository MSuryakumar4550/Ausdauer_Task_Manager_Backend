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
const { protect, adminOnly } = require('../middleware/authMiddleware'); // Ensure adminOnly is imported if used
const upload = require('../middleware/uploadMiddleware');

/**
 * ==================================================================================
 * AUSDAUER AUTH ROUTES (VERSION 3.8.0 - ADMIN SYNC FINAL)
 * ==================================================================================
 */

// --- PUBLIC SECURITY ROUTES ---
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP); 

// --- PROTECTED PERSONNEL ROUTES (Require Token) ---
// SECURITY RESTORED: Added 'protect' back to this line!
router.post('/', protect, upload.single('photo'), registerUser); 
router.get('/me', protect, getMe); 
router.get('/leaderboard', protect, getLeaderboard); 

// --- CHAIR SPECIFIC COMMANDS ---
router.put('/reset-scores', protect, resetScores); 
router.put('/score/:id', protect, updateScore); 
router.delete('/:id', protect, deleteUser); 

// --- IDENTITY UPDATES ---
router.put('/:id', protect, upload.single('photo'), updateUser);

module.exports = router;