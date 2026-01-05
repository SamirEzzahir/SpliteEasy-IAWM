const express = require('express');
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Split = require('../models/Split');
const Membership = require('../models/Membership');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get expense statistics grouped by group (for overview page)
// @route   GET /api/stats/groups
// @access  Private
router.get('/groups', async (req, res, next) => {
  try {
    const { user_id, time_range = 'monthly', from_date, to_date } = req.query;
    
    // For now, return sample data structure matching Python
    // TODO: Implement actual aggregation queries
    const sampleData = [
      {
        group_id: 1,
        group_name: "Sample Group",
        amount: 0
      }
    ];
    
    res.status(200).json(sampleData);
  } catch (error) {
    next(error);
  }
});

// @desc    Get total expenses for current user
// @route   GET /api/stats/user
// @access  Private
router.get('/user', async (req, res, next) => {
  try {
    // TODO: Implement actual user expense calculation
    const userStats = {
      user_id: req.user._id,
      username: req.user.username,
      total_expenses: 0
    };
    
    res.status(200).json(userStats);
  } catch (error) {
    next(error);
  }
});

// @desc    Get expenses per group for current user
// @route   GET /api/stats/user/groups
// @access  Private
router.get('/user/groups', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    
    // TODO: Implement actual group expense calculation
    const groupStats = [];
    
    res.status(200).json(groupStats);
  } catch (error) {
    next(error);
  }
});

// @desc    Get daily expense statistics
// @route   GET /api/stats/user/daily
// @access  Private
router.get('/user/daily', async (req, res, next) => {
  try {
    // Return last 7 days with zero amounts (matching Python structure)
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        amount: 0
      });
    }
    
    res.status(200).json(dailyStats);
  } catch (error) {
    next(error);
  }
});

// @desc    Get category expense statistics
// @route   GET /api/stats/user/categories
// @access  Private
router.get('/user/categories', async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    
    // TODO: Implement actual category expense calculation
    const categoryStats = [
      {
        category: "Food",
        amount: 0
      },
      {
        category: "Transport",
        amount: 0
      },
      {
        category: "Entertainment",
        amount: 0
      }
    ];
    
    res.status(200).json(categoryStats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;