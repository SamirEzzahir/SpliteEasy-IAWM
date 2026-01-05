const express = require('express');
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get all transactions for current user
// @route   GET /api/transactions
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    // Get all transactions for the current user
    const transactions = await Transaction.find({ userId: req.user._id })
      .populate('fromWalletId', 'name category balance')
      .populate('toWalletId', 'name category balance')
      .sort({ createdAt: -1 });

    // Format response to match Python structure
    const transactionList = transactions.map(t => ({
      id: t._id,
      user_id: t.userId,
      from_wallet_id: t.fromWalletId?._id || null,
      to_wallet_id: t.toWalletId?._id || null,
      transaction_type: t.transactionType || 'transfer',
      amount: parseFloat(t.amount.toString()),
      note: t.note || null,
      created_at: t.createdAt,
      from_wallet: t.fromWalletId ? {
        id: t.fromWalletId._id,
        name: t.fromWalletId.name,
        category: t.fromWalletId.category,
        balance: parseFloat(t.fromWalletId.balance.toString())
      } : null,
      to_wallet: t.toWalletId ? {
        id: t.toWalletId._id,
        name: t.toWalletId.name,
        category: t.toWalletId.category,
        balance: parseFloat(t.toWalletId.balance.toString())
      } : null
    }));

    res.status(200).json(transactionList);
  } catch (error) {
    next(error);
  }
});

// @desc    Get specific transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    })
      .populate('fromWalletId', 'name category balance')
      .populate('toWalletId', 'name category balance');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Format response to match Python structure
    const transactionData = {
      id: transaction._id,
      user_id: transaction.userId,
      from_wallet_id: transaction.fromWalletId?._id || null,
      to_wallet_id: transaction.toWalletId?._id || null,
      transaction_type: transaction.transactionType || 'transfer',
      amount: parseFloat(transaction.amount.toString()),
      note: transaction.note || null,
      created_at: transaction.createdAt,
      from_wallet: transaction.fromWalletId ? {
        id: transaction.fromWalletId._id,
        name: transaction.fromWalletId.name,
        category: transaction.fromWalletId.category,
        balance: parseFloat(transaction.fromWalletId.balance.toString())
      } : null,
      to_wallet: transaction.toWalletId ? {
        id: transaction.toWalletId._id,
        name: transaction.toWalletId.name,
        category: transaction.toWalletId.category,
        balance: parseFloat(transaction.toWalletId.balance.toString())
      } : null
    };

    res.status(200).json(transactionData);
  } catch (error) {
    next(error);
  }
});

module.exports = router;