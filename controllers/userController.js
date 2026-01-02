const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { sendOTPEmail } = require('../utils/emailService'); 

/**
 * ==================================================================================
 * AUSDAUER BACKEND - USER CONTROLLER (VERSION 3.8.0 - ADMIN SYNC STABILIZED)
 * ==================================================================================
 */

// @desc    Authenticate a user via Password
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'System Error: Missing login credentials.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && (await bcrypt.compare(password, user.password))) {
      console.log(`[AUTH SUCCESS] User logged in: ${user.email}`);
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        score: user.score,
        photo: user.photo,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Security Alert: Invalid credentials provided.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register new user (Chair or Employee)
// @route   POST /api/users
const registerUser = async (req, res) => {
  try {
    // --- TEMPORARY UNLOCK START ---
    // I have commented this out so you can create the first Admin/Chair.
    // AFTER you create the user, come back and uncomment these lines!
    
    // if (!req.user || req.user.role !== 'Chair') {
    //   return res.status(403).json({ message: 'Access Denied: Chair authorization required.' });
    // }
    
    // --- TEMPORARY UNLOCK END ---

    const { name, email, password, role, designation, department, mobile, dateOfJoining } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Validation Error: Required fields missing.' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'Database Conflict: User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const photoPath = req.file ? `/uploads/${req.file.filename}` : '';

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'Employee',
      designation,
      department,
      mobile: mobile || '',
      photo: photoPath,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
      score: 0 
    });

    if (user) {
      res.status(201).json({ _id: user.id, name: user.name, role: user.role, token: generateToken(user._id) });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unified personnel directory
// @route   GET /api/users/leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.find({}) 
      .sort({ score: -1 })
      .select('name score designation department role email photo mobile');
    res.status(200).json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (req.user.id !== user.id && req.user.role !== 'Chair') {
      return res.status(403).json({ message: 'Access Denied.' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.mobile = req.body.mobile || user.mobile;
    user.designation = req.body.designation || user.designation;
    user.department = req.body.department || user.department;

    if (req.user.role === 'Chair') {
        if (req.body.role) user.role = req.body.role;
        if (req.body.dateOfJoining) user.dateOfJoining = req.body.dateOfJoining;
    }

    if (req.body.password && req.body.password.trim().length > 0) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
    }

    if (req.file) user.photo = `/uploads/${req.file.filename}`;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user and all associated data (Cascade Fix)
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'Chair') return res.status(403).json({ message: 'Denied' });
    
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Error: Cannot delete self' });
    }

    // CASCADE DELETE: Clear tasks before removing user
    const Task = require('../models/taskModel');
    await Task.deleteMany({ assignedTo: user._id });

    await User.findByIdAndDelete(req.params.id);
    console.log(`[SECURITY] Account for ${user.email} and all linked tasks purged.`);
    
    res.status(200).json({ message: 'User and linked data purged' });
  } catch (error) { 
    res.status(500).json({ message: 'Purge failed.' }); 
  }
};

// @desc    Update Score (Chair Override)
const updateScore = async (req, res) => {
  try {
    if (req.user.role !== 'Chair') return res.status(403).json({ message: 'Denied' });
    const user = await User.findById(req.params.id);
    user.score = req.body.score;
    await user.save();
    res.status(200).json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc    Reset personnel scores (ZERO SYNC TRIGGER)
// @route   PUT /api/users/reset-scores
const resetScores = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'Chair') {
        return res.status(403).json({ message: 'Access Denied: Chair clearance required.' });
    }
    
    // ATOMIC UPDATE: Most efficient way to reset large datasets
    const resetResult = await User.updateMany({}, { $set: { score: 0 } });
    
    console.log(`[ADMIN COMMAND] Scores reset by ${req.user.email}. Affected: ${resetResult.modifiedCount}`);
    
    res.status(200).json({ 
        success: true,
        message: 'Score synchronization complete. All operative points set to zero.',
        modifiedCount: resetResult.modifiedCount 
    });
  } catch (error) { 
    res.status(500).json({ message: 'Score reset failed: ' + error.message }); 
  }
};

// ==================================================================================
// CRITICAL: OTP BYPASS ENGINE
// ==================================================================================

// @desc    Step 1: Generate and Send OTP
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Security Alert: Email not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 20 * 60 * 1000); 
    await user.save();

    await sendOTPEmail(user.email, otp);
    console.log(`[STABILIZED] OTP ${otp} sent to ${email}`);
    res.status(200).json({ message: 'Security code transmitted.' });
  } catch (error) { res.status(500).json({ message: 'Transmission failure.' }); }
};

// @desc    Step 2: Verify OTP and Login (ZERO-FAILURE SYNC)
const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user || !user.otp) return res.status(400).json({ message: 'Invalid request.' });

        // String-based comparison to preserve leading zeros
        if (String(user.otp) !== String(otp).trim()) {
            return res.status(400).json({ message: 'Incorrect Security Code.' });
        }

        // Absolute timestamp check to fix "Expired" bug
        if (new Date(user.otpExpiry).getTime() < Date.now()) {
            return res.status(400).json({ message: 'This code has expired.' });
        }

        user.otp = null; user.otpExpiry = null; await user.save();
        res.status(200).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photo: user.photo,
            token: generateToken(user._id)
        });
    } catch (error) { res.status(500).json({ message: 'Verification Error.' }); }
};

const getMe = async (req, res) => res.status(200).json(req.user);

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

module.exports = {
  registerUser, loginUser, getMe, getLeaderboard,
  updateUser, updateScore, deleteUser, resetScores,
  forgotPassword, verifyOTP
};