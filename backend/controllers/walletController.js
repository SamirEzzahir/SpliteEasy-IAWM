const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Get user wallets
 * @route   GET /api/wallets
 * @access  Private
 */
const getUserWallets = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    const query = { userId: req.user._id };
    if (category) query.category = category;
    
    const wallets = await Wallet.find(query).sort({ createdAt: -1 });
    
    // Return direct array (like Python version)
    res.status(200).json(wallets);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create wallet
 * @route   POST /api/wallets
 * @access  Private
 */
const createWallet = async (req, res, next) => {
  try {
    const { name, category, balance } = req.body;
    
    // Normalize category to lowercase format expected by model
    const categoryMap = {
      'Cash': 'cash',
      'Bank': 'bank', 
      'Credit Card': 'credit_card',
      'Other': 'other',
      'cash': 'cash',
      'bank': 'bank',
      'credit_card': 'credit_card',
      'other': 'other'
    };
    
    const normalizedCategory = categoryMap[category] || category.toLowerCase();
    
    // Create wallet
    const wallet = await Wallet.create({
      userId: req.user._id,
      name,
      category: normalizedCategory,
      balance: balance || 0
    });
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'wallet_created',
      details: {
        walletId: wallet._id,
        name,
        category: normalizedCategory,
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
};

/**
 * @desc    Get wallet by ID
 * @route   GET /api/wallets/:id
 * @access  Private
 */
const getWalletById = async (req, res, next) => {
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
};

/**
 * @desc    Update wallet
 * @route   PUT /api/wallets/:id
 * @access  Private
 */
const updateWallet = async (req, res, next) => {
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
    
    // Normalize category if it's being updated
    if (updates.category) {
      const categoryMap = {
        'Cash': 'cash',
        'Bank': 'bank', 
        'Credit Card': 'credit_card',
        'Other': 'other',
        'cash': 'cash',
        'bank': 'bank',
        'credit_card': 'credit_card',
        'other': 'other'
      };
      
      updates.category = categoryMap[updates.category] || updates.category.toLowerCase();
    }
    
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
};

/**
 * @desc    Delete wallet
 * @route   DELETE /api/wallets/:id
 * @access  Private
 */
const deleteWallet = async (req, res, next) => {
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
};

module.exports = {
  getUserWallets,
  createWallet,
  getWalletById,
  updateWallet,
  deleteWallet
};