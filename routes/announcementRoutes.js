const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement // <--- Import the function
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');

// Base Route: /api/announcements

router.route('/')
  .get(protect, getAnnouncements)
  .post(protect, createAnnouncement);

// The Delete Route
router.route('/:id')
  .delete(protect, deleteAnnouncement); // <--- This enables the delete button

module.exports = router;