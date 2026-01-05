const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Create income
// @route   POST /api/incomes
// @access  Private
router.post('/', async (req, res, next) => {
  try {
    const { amount, description, wallet_id, income_type_id, date } = req.body;
    
    // TODO: Implement actual income creation
    const income = {
      id: Date.now(),
      user_id: req.user._id,
      amount: parseFloat(amount),
      description,
      wallet_id,
      income_type_id,
      date: date || new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    res.status(201).json(income);
  } catch (error) {
    next(error);
  }
});

// @desc    Get user incomes (with wallet and type names)
// @route   GET /api/incomes
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    // TODO: Implement actual income fetching with joins
    // Return structure matching Python IncomeReadWithNames
    const incomes = [];
    
    res.status(200).json(incomes);
  } catch (error) {
    next(error);
  }
});

// @desc    Get income summary (balance summary)
// @route   GET /api/incomes/summary
// @access  Private
router.get('/summary', async (req, res, next) => {
  try {
    // TODO: Implement actual balance calculation
    const summary = {
      bank: 0,
      cash: 0,
      total: 0
    };
    
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
});

// @desc    Update income
// @route   PUT /api/incomes/:id
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, description, wallet_id, income_type_id, date } = req.body;
    
    // TODO: Implement actual income update
    const updatedIncome = {
      id: parseInt(id),
      user_id: req.user._id,
      amount: parseFloat(amount),
      description,
      wallet_id,
      income_type_id,
      date,
      updated_at: new Date().toISOString()
    };
    
    res.status(200).json(updatedIncome);
  } catch (error) {
    next(error);
  }
});

// @desc    Delete income
// @route   DELETE /api/incomes/:id
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // TODO: Implement actual income deletion
    res.status(200).json({ 
      success: true, 
      message: 'Income deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;