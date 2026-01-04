const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user activity
// @route   GET /api/activity
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const activities = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ActivityLog.countDocuments({ userId: req.user._id });
    
    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          totalActivities: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;