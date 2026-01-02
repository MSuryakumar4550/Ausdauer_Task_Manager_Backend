const mongoose = require('mongoose');

/**
 * ==================================================================================
 * AUSDAUER SYSTEM: TASK DATA MODEL (VERSION 2.3.0)
 * ==================================================================================
 * * CRITICAL SCHEMA UPDATES:
 * 1. COMMENT ROLE: Added 'role' to identify if sender is Chair or Employee.
 * 2. USERNAME PERSISTENCE: Saves the name at time of comment for faster rendering.
 * 3. PRIORITY ENUM: Fully synchronized with 'Emergency' urgency levels.
 * ==================================================================================
 */

const taskSchema = mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a task title'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  priority: {
    type: String,
    // Synchronized with Chair 'Live Urgency Control'
    enum: ['Low', 'Medium', 'High', 'Emergency'], 
    default: 'Medium',
  },
  deadline: {
    type: Date,
    required: [true, 'Please add a deadline'],
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending',
  },
  progress: {
    type: Number,
    default: 0,
  },
  // --- RECONSTRUCTED COMMENT LOG ---
  comments: [
    {
      user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      userName: String, // Added for quick display
      role: { 
        type: String, 
        enum: ['Chair', 'Employee'] // CRITICAL: Ensures role is stored
      },
      text: { 
        type: String, 
        required: true 
      },
      createdAt: { 
        type: Date, 
        default: Date.now 
      }
    }
  ]
}, {
  // CRITICAL: Used by getTaskStatusMetrics to freeze completion time
  timestamps: true, 
});

module.exports = mongoose.model('Task', taskSchema);