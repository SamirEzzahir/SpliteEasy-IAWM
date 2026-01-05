const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user loans
// @route   GET /api/debts-loans/loans
// @access  Private
router.get('/loans', async (req, res, next) => {
  try {
    // For now, return empty array
    // TODO: Implement loans tracking
    res.status(200).json([]);
  } catch (error) {
    next(error);
  }
});

// @desc    Get user debts
// @route   GET /api/debts-loans/debts
// @access  Private
router.get('/debts', async (req, res, next) => {
  try {
    // For now, return empty array
    // TODO: Implement debts tracking
    res.status(200).json([]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;