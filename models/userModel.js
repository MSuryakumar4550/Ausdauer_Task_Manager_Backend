const mongoose = require('mongoose');

/**
 * ==================================================================================
 * AUSDAUER SYSTEM: USER DATA MODEL (VERSION 3.1.0 - EXPIRY STABILIZER)
 * ==================================================================================
 * * MODULE ADDITIONS:
 * 1. OTP ENGINE: Optimized for string-based 6-digit verification codes.
 * 2. EXPIRY SYNC: Uses standard Date objects compatible with absolute millisecond checks.
 * 3. RATE LIMITING: Added lastOtpRequest to monitor transmission frequency.
 * ==================================================================================
 */

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
  },
  role: {
    type: String,
    enum: ['Employee', 'Chair'], 
    default: 'Employee',
  },
  // Personnel Profile Data
  designation: { type: String }, 
  department: { type: String },
  mobile: { type: String },
  photo: { type: String }, 
  dateOfJoining: { type: Date },
  
  score: {
    type: Number,
    default: 0,
  },

  // --- FORGOT PASSWORD / OTP ENGINE ---
  otp: {
    type: String, // Enforces string to preserve leading zeros (e.g. 054321)
    default: null
  },
  otpExpiry: {
    type: Date, // Stores timestamp for absolute comparison
    default: null
  },
  lastOtpRequest: {
    type: Date, // Patch: Track when the last code was sent
    default: null
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);