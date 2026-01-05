const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get income types
// @route   GET /api/incometype
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    // Return default income types (matching what frontend expects)
    const incomeTypes = [
      { id: 1, name: 'Salary', category: 'work' },
      { id: 2, name: 'Freelance', category: 'work' },
      { id: 3, name: 'Investment', category: 'passive' },
      { id: 4, name: 'Gift', category: 'other' },
      { id: 5, name: 'Bonus', category: 'work' },
      { id: 6, name: 'Other', category: 'other' }
    ];
    res.status(200).json(incomeTypes);
  } catch (error) {
    next(error);
  }
});

// @desc    Delete income type
// @route   DELETE /api/incometype/:id
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    // TODO: Implement income type deletion
    res.status(200).json({ 
      success: true, 
      message: 'Income type deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;