const Announcement = require('../models/announcementModel');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Chair Only)
const createAnnouncement = async (req, res) => {
  if (req.user.role !== 'Chair') {
    return res.status(403).json({ message: 'Access Denied. Only Chair can post announcements.' });
  }

  const { title, message } = req.body;

  try {
    if (!title || !message) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const announcement = await Announcement.create({
      title,
      message,
      createdBy: req.user.id
    });

    // Real-time Update
    const io = req.app.get('io');
    if (io) io.emit('announcement_update', announcement);

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Chair Only)
const deleteAnnouncement = async (req, res) => {
  if (req.user.role !== 'Chair') {
    return res.status(403).json({ message: 'Access Denied.' });
  }

  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    // Trigger Socket Update (Critical for Dashboard refresh)
    const io = req.app.get('io');
    if (io) {
        io.emit('announcement_update', { id: req.params.id, type: 'DELETED' });
    }

    res.status(200).json({ id: req.params.id, message: 'Announcement removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement // <--- THIS WAS LIKELY MISSING
};