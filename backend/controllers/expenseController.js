const Expense = require('../models/Expense');
const Split = require('../models/Split');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Create expense
 * @route   POST /api/expenses
 * @access  Private
 */
const createExpense = async (req, res, next) => {
  try {
    // Handle both camelCase and snake_case formats
    const groupId = req.body.groupId || req.body.group_id;
    const payerId = req.body.payerId || req.body.payer_id || req.user._id;
    const walletId = req.body.walletId || req.body.wallet_id;
    const { description, amount, currency, category, splitType, note } = req.body;
    
    // Handle splits - convert snake_case to camelCase if needed
    let splits = req.body.splits;
    if (splits && splits.length > 0) {
      splits = splits.map(split => ({
        userId: split.userId || split.user_id,
        shareAmount: split.shareAmount || split.share_amount
      }));
    }
    
    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add expenses to this group'
      });
    }
    
    // Create expense
    const expense = await Expense.create({
      groupId,
      payerId,
      addedBy: req.user._id,
      description,
      amount,
      currency: currency || group.currency,
      category,
      walletId,
      splitType,
      note
    });
    
    // Handle splits
    let expenseSplits;
    if (splits && splits.length > 0) {
      // Validate splits
      if (!expense.validateSplits(splits)) {
        await Expense.findByIdAndDelete(expense._id);
        return res.status(400).json({
          success: false,
          message: 'Split amounts do not match expense total'
        });
      }
      expenseSplits = splits;
    } else {
      // Equal split among all members
      const members = await Membership.getGroupMembers(groupId);
      const memberIds = members.map(m => m.userId._id);
      expenseSplits = expense.calculateEqualSplits(memberIds);
    }
    
    // Create splits
    await Split.createSplits(expense._id, expenseSplits);
    
    // Create notifications
    await Notification.createExpenseNotification(expense, 'added');
    
    // Get populated expense
    const populatedExpense = await Expense.findById(expense._id)
      .populate('payerId', 'firstName lastName username')
      .populate('addedBy', 'firstName lastName username')
      .populate('walletId', 'name category')
      .populate('splits');
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: { expense: populatedExpense }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group expenses
 * @route   GET /api/expenses/:groupId
 * @access  Private
 */
const getGroupExpenses = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { page, limit, category, payerId, startDate, endDate, sortBy, sortOrder } = req.query;
    
    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view expenses for this group'
      });
    }
    
    const result = await Expense.getGroupExpenses(groupId, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      payerId,
      startDate,
      endDate,
      sortBy,
      sortOrder
    });
    
    // Transform expenses to match frontend expectations
    const transformedExpenses = result.expenses.map(expense => ({
      ...expense.toObject(),
      payer_id: expense.payerId._id,
      payer_username: expense.payerId.username,
      id: expense._id
    }));
    
    res.status(200).json({
      success: true,
      data: {
        ...result,
        expenses: transformedExpenses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get expense by ID
 * @route   GET /api/expenses/exp/:id
 * @access  Private
 */
const getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('payerId', 'firstName lastName username profilePhoto')
      .populate('addedBy', 'firstName lastName username')
      .populate('walletId', 'name category')
      .populate({
        path: 'splits',
        populate: {
          path: 'userId',
          select: 'firstName lastName username profilePhoto'
        }
      });
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Check if user is member of the group
    const group = await Group.findById(expense.groupId);
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this expense'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { expense }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update expense
 * @route   PUT /api/expenses/:id
 * @access  Private
 */
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Check if user can update (added by user or group admin)
    const group = await Group.findById(expense.groupId);
    const isAdmin = await group.isAdmin(req.user._id);
    const isCreator = expense.addedBy.toString() === req.user._id.toString();
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this expense'
      });
    }
    
    const allowedFields = ['description', 'amount', 'currency', 'category', 'walletId', 'splitType', 'note', 'splits'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    // Update expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    // Handle splits update
    if (req.body.splits) {
      if (!updatedExpense.validateSplits(req.body.splits)) {
        return res.status(400).json({
          success: false,
          message: 'Split amounts do not match expense total'
        });
      }
      await Split.createSplits(updatedExpense._id, req.body.splits);
    }
    
    // Create notifications
    await Notification.createExpenseNotification(updatedExpense, 'updated');
    
    // Get populated expense
    const populatedExpense = await Expense.findById(updatedExpense._id)
      .populate('payerId', 'firstName lastName username')
      .populate('addedBy', 'firstName lastName username')
      .populate('walletId', 'name category')
      .populate('splits');
    
    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: { expense: populatedExpense }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Check if user can delete (added by user or group admin)
    const group = await Group.findById(expense.groupId);
    const isAdmin = await group.isAdmin(req.user._id);
    const isCreator = expense.addedBy.toString() === req.user._id.toString();
    
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense'
      });
    }
    
    // Delete splits
    await Split.deleteMany({ expenseId: expense._id });
    
    // Delete expense
    await Expense.findByIdAndDelete(req.params.id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: expense.groupId,
      action: 'expense_deleted',
      details: {
        expenseId: expense._id,
        description: expense.description,
        amount: parseFloat(expense.amount.toString())
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExpense,
  getGroupExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
};