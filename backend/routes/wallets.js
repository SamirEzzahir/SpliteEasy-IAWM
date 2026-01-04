const express = require('express');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Create wallet
// @route   POST /api/wallets
// @access  Private
router.post('/', validate(schemas.walletCreate), async (req, res, next) => {
  try {
    const { name, category, balance } = req.body;
    
    // Create wallet
    const wallet = await Wallet.create({
      userId: req.user._id,
      name,
      category,
      balance: balance || 0
    });
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'wallet_created',
      details: {
        walletId: wallet._id,
        name,
        category,
        balance: parseFloat(wallet.balance.toString())
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      data: { wallet }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Wallet with this name already exists'
      });
    }
    next(error);
  }
});

// @desc    Get user wallets
// @route   GET /api/wallets
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    
    const query = { userId: req.user._id };
    if (category) query.category = category;
    
    const wallets = await Wallet.find(query).sort({ createdAt: -1 });
    
    // Calculate total balance
    const totalBalance = await Wallet.getUserTotalBalance(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        wallets,
        totalBalance
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get wallet by ID
// @route   GET /api/wallets/:id
// @access  Private
router.get('/:id', validate(schemas.objectId, 'params'), async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if wallet belongs to user
    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this wallet'
      });
    }
    
    // Get recent transactions
    const transactions = await Transaction.find({
      $or: [
        { fromWalletId: wallet._id },
        { toWalletId: wallet._id }
      ]
    })
    .populate('fromWalletId', 'name category')
    .populate('toWalletId', 'name category')
    .sort({ createdAt: -1 })
    .limit(10);
    
    res.status(200).json({
      success: true,
      data: {
        wallet,
        recentTransactions: transactions
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update wallet
// @route   PUT /api/wallets/:id
// @access  Private
router.put('/:id',
  validate(schemas.objectId, 'params'),
  validate(schemas.walletUpdate),
  async (req, res, next) => {
    try {
      const wallet = await Wallet.findById(req.params.id);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Check if wallet belongs to user
      if (wallet.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this wallet'
        });
      }
      
      const allowedFields = ['name', 'category', 'balance'];
      const updates = {};
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      
      const updatedWallet = await Wallet.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );
      
      // Log activity
      await ActivityLog.logActivity({
        userId: req.user._id,
        action: 'wallet_updated',
        details: {
          walletId: wallet._id,
          updates
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(200).json({
        success: true,
        message: 'Wallet updated successfully',
        data: { wallet: updatedWallet }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Wallet with this name already exists'
        });
      }
      next(error);
    }
  }
);

// @desc    Delete wallet
// @route   DELETE /api/wallets/:id
// @access  Private
router.delete('/:id', validate(schemas.objectId, 'params'), async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if wallet belongs to user
    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this wallet'
      });
    }
    
    // Check if wallet is used in any expenses
    const Expense = require('../models/Expense');
    const expenseCount = await Expense.countDocuments({ walletId: wallet._id });
    
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete wallet that is used in expenses'
      });
    }
    
    // Delete wallet
    await Wallet.findByIdAndDelete(req.params.id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'wallet_deleted',
      details: {
        walletId: wallet._id,
        name: wallet.name,
        category: wallet.category
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Wallet deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Transfer between wallets
// @route   POST /api/wallets/transfer
// @access  Private
router.post('/transfer', validate(schemas.walletTransfer), async (req, res, next) => {
  try {
    const { fromWalletId, toWalletId, amount, description } = req.body;
    
    // Check if both wallets exist and belong to user
    const fromWallet = await Wallet.findById(fromWalletId);
    const toWallet = await Wallet.findById(toWalletId);
    
    if (!fromWallet || !toWallet) {
      return res.status(404).json({
        success: false,
        message: 'One or both wallets not found'
      });
    }
    
    if (fromWallet.userId.toString() !== req.user._id.toString() ||
        toWallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to transfer between these wallets'
      });
    }
    
    if (fromWalletId === toWalletId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to the same wallet'
      });
    }
    
    // Perform transfer
    const result = await Wallet.transfer(fromWalletId, toWalletId, amount, description);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'wallet_transfer',
      details: {
        fromWalletId,
        toWalletId,
        amount,
        description,
        fromWalletName: fromWallet.name,
        toWalletName: toWallet.name
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Get updated wallets
    const updatedFromWallet = await Wallet.findById(fromWalletId);
    const updatedToWallet = await Wallet.findById(toWalletId);
    
    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        fromWallet: updatedFromWallet,
        toWallet: updatedToWallet
      }
    });
  } catch (error) {
    if (error.message.includes('Insufficient balance') || 
        error.message.includes('Cannot transfer between wallets')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

// @desc    Get wallet transactions
// @route   GET /api/wallets/:id/transactions
// @access  Private
router.get('/:id/transactions',
  validate(schemas.objectId, 'params'),
  validate(schemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      
      const wallet = await Wallet.findById(req.params.id);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }
      
      // Check if wallet belongs to user
      if (wallet.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view transactions for this wallet'
        });
      }
      
      const query = {
        $or: [
          { fromWalletId: wallet._id },
          { toWalletId: wallet._id }
        ]
      };
      
      const transactions = await Transaction.find(query)
        .populate('fromWalletId', 'name category')
        .populate('toWalletId', 'name category')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await Transaction.countDocuments(query);
      
      res.status(200).json({
        success: true,
        data: {
          transactions,
          pagination: {
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            totalTransactions: total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get wallet statistics
// @route   GET /api/wallets/:id/stats
// @access  Private
router.get('/:id/stats', validate(schemas.objectId, 'params'), async (req, res, next) => {
  try {
    const wallet = await Wallet.findById(req.params.id);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    // Check if wallet belongs to user
    if (wallet.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view statistics for this wallet'
      });
    }
    
    // Get transaction statistics
    const totalIncoming = await Transaction.aggregate([
      { $match: { toWalletId: wallet._id } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
    ]);
    
    const totalOutgoing = await Transaction.aggregate([
      { $match: { fromWalletId: wallet._id } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
    ]);
    
    const transactionCount = await Transaction.countDocuments({
      $or: [
        { fromWalletId: wallet._id },
        { toWalletId: wallet._id }
      ]
    });
    
    // Get expense statistics
    const Expense = require('../models/Expense');
    const expenseCount = await Expense.countDocuments({ walletId: wallet._id });
    
    const expenseTotal = await Expense.aggregate([
      { $match: { walletId: wallet._id } },
      { $group: { _id: null, total: { $sum: { $toDouble: '$amount' } } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        wallet,
        statistics: {
          currentBalance: parseFloat(wallet.balance.toString()),
          totalIncoming: totalIncoming[0]?.total || 0,
          totalOutgoing: totalOutgoing[0]?.total || 0,
          transactionCount,
          expenseCount,
          totalExpenses: expenseTotal[0]?.total || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;