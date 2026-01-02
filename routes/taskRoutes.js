const express = require('express');
const router = express.Router();
const { 
    getTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    addComment // <--- Ensure this is imported
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getTasks).post(protect, createTask);
router.route('/:id').put(protect, updateTask).delete(protect, deleteTask);

// --- NEW ROUTE FOR CHAT ---
router.route('/:id/comments').post(protect, addComment); 

module.exports = router;