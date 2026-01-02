const Task = require('../models/taskModel');
const User = require('../models/userModel');
const sendCalendarInvite = require('../utils/emailService');

/**
 * ==================================================================================
 * AUSDAUER SYSTEM: TASK CONTROL ENGINE (VERSION 2.2.0)
 * ==================================================================================
 * * CORE ENGINES:
 * 1. SCORING Handshake: Automated +10 for on-time, -10 for un-completing.
 * 2. LIVE CHAT Handshake: Unified role-based transmission.
 * 3. PRIORITY Intimation: Targeted Socket.io alerts via User ID Rooms.
 * ==================================================================================
 */

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private (Chair Only)
const createTask = async (req, res) => {
  try {
    if (req.user.role !== 'Chair') {
      return res.status(403).json({ message: 'Access denied. Chair only.' });
    }

    const { title, description, assignedTo, priority, deadline } = req.body;

    if (!title || !description || !assignedTo || !deadline) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    const task = await Task.create({
      title, 
      description, 
      assignedTo, 
      assignedBy: req.user.id, 
      priority, 
      deadline,
      status: 'Pending',
      progress: 0
    });

    const employee = await User.findById(assignedTo);
    if (employee && employee.email) {
        try {
            sendCalendarInvite(employee.email, task);
        } catch (emailError) {
            console.error("Email Invite Failed:", emailError);
        }
    }

    const io = req.app.get('io');
    if (io) {
        // Broad alert for dashboard refresh
        io.emit('task_update', { message: 'New Mission Assigned' });
        // Specific alert to the operative
        io.to(assignedTo.toString()).emit('priority_intimation', {
            title: task.title,
            newPriority: priority,
            urgent: priority === 'Emergency'
        });
    }

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all tasks (Sorted by Priority)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const query = req.user.role === 'Chair' ? {} : { assignedTo: req.user.id };
    
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email photo')
      .populate('assignedBy', 'name role');

    const priorityWeight = { 'Emergency': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
    
    tasks.sort((a, b) => {
      const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
      return diff === 0 ? new Date(a.deadline) - new Date(b.deadline) : diff;
    });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status & Handle Priority Alerts
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.assignedTo.toString() !== req.user.id && req.user.role !== 'Chair') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const { status, priority } = req.body;
    const oldPriority = task.priority;

    // --- SCORING ENGINE ---
    if (status && status !== task.status) {
        const employee = await User.findById(task.assignedTo);
        const isOnTime = new Date() <= new Date(task.deadline);

        if (status === 'Completed' && task.status !== 'Completed') {
            if (isOnTime) employee.score += 10;
            // CRITICAL: Set the fixed completion time
            task.updatedAt = new Date(); 
        } 
        else if (task.status === 'Completed' && status !== 'Completed') {
            if (employee.score >= 10) employee.score -= 10;
        }
        
        await employee.save();
        task.status = status;
        task.progress = status === 'Completed' ? 100 : status === 'In Progress' ? 50 : 0;
    }

    // --- PRIORITY ENGINE & TARGETED ALERT ---
    if (priority && priority !== oldPriority) {
        task.priority = priority;
        
        const io = req.app.get('io');
        if (io) {
            io.to(task.assignedTo.toString()).emit('priority_intimation', {
                title: task.title,
                newPriority: priority,
                urgent: priority === 'Emergency'
            });
        }
    }

    await task.save();

    // Trigger full dashboard re-fetch for all active users
    const io = req.app.get('io');
    if (io) io.emit('task_update', { message: 'System Sync Triggered' });

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add Comment (Unified Chat Engine)
// @route   POST /api/tasks/:id/comments
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ message: 'Mission log not found' });

    const comment = { 
        user: req.user.id, 
        userName: req.user.name,
        role: req.user.role, // This ensures 'Chair' or 'Employee' is saved
        text, 
        createdAt: new Date() 
    };
    
    task.comments.push(comment);
    await task.save();

    // SOCKET Handshake for Real-Time Chat
    const io = req.app.get('io');
    if (io) {
        io.emit('task_update', { 
            message: `New transmission: ${task.title}`,
            type: 'COMMENT_ADDED'
        });
    }

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (Chair Only)
const deleteTask = async (req, res) => {
  if (req.user.role !== 'Chair') {
    return res.status(403).json({ message: 'Access Denied.' });
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    await Task.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) io.emit('task_update', { id: req.params.id, type: 'DELETED' });

    res.status(200).json({ id: req.params.id, message: 'Purge successful.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment
};