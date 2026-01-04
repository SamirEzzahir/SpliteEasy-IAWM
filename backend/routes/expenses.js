const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;

const Expense = require('../models/Expense');
const Split = require('../models/Split');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `expense-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  }
});

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private
router.post('/', validate(schemas.expenseCreate), async (req, res, next) => {
  try {
    const { groupId, description, amount, currency, category, walletId, splitType, note, splits } = req.body;
    
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
      payerId: req.user._id,
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
});

// @desc    Get group expenses
// @route   GET /api/expenses/:groupId
// @access  Private
router.get('/:groupId', 
  validate(schemas.objectId, 'params'),
  validate(schemas.pagination, 'query'),
  async (req, res, next) => {
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
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get expense by ID
// @route   GET /api/expenses/exp/:id
// @access  Private
router.get('/exp/:id', validate(schemas.objectId, 'params'), async (req, res, next) => {
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
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id',
  validate(schemas.objectId, 'params'),
  validate(schemas.expenseUpdate),
  async (req, res, next) => {
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
  }
);

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', validate(schemas.objectId, 'params'), async (req, res, next) => {
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
});

// @desc    Upload Excel file with expenses
// @route   POST /api/expenses/:groupId/upload
// @access  Private
router.post('/:groupId/upload',
  validate(schemas.objectId, 'params'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { groupId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
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
          message: 'Not authorized to upload expenses to this group'
        });
      }
      
      // Read Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Get group members for validation
      const members = await Membership.getGroupMembers(groupId);
      const memberEmails = members.map(m => m.userId.email.toLowerCase());
      
      // Process each row
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          
          // Validate required fields
          if (!row.description || !row.amount || !row.payer_email) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Missing required fields (description, amount, payer_email)`);
            continue;
          }
          
          // Find payer
          const payerMember = members.find(m => 
            m.userId.email.toLowerCase() === row.payer_email.toLowerCase()
          );
          
          if (!payerMember) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Payer email not found in group members`);
            continue;
          }
          
          // Create expense
          const expense = await Expense.create({
            groupId,
            payerId: payerMember.userId._id,
            addedBy: req.user._id,
            description: row.description,
            amount: parseFloat(row.amount),
            currency: row.currency || group.currency,
            category: row.category || 'General',
            note: row.note || ''
          });
          
          // Handle splits (equal split if not specified)
          let expenseSplits;
          if (row.split_emails) {
            const splitEmails = row.split_emails.split(',').map(email => email.trim().toLowerCase());
            const splitMembers = members.filter(m => 
              splitEmails.includes(m.userId.email.toLowerCase())
            );
            
            if (splitMembers.length === 0) {
              results.failed++;
              results.errors.push(`Row ${i + 2}: No valid split members found`);
              await Expense.findByIdAndDelete(expense._id);
              continue;
            }
            
            const splitAmount = parseFloat(row.amount) / splitMembers.length;
            expenseSplits = splitMembers.map(member => ({
              userId: member.userId._id,
              shareAmount: splitAmount
            }));
          } else {
            // Equal split among all members
            const memberIds = members.map(m => m.userId._id);
            expenseSplits = expense.calculateEqualSplits(memberIds);
          }
          
          // Create splits
          await Split.createSplits(expense._id, expenseSplits);
          
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }
      
      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (error) {
        console.error('Error deleting uploaded file:', error);
      }
      
      res.status(200).json({
        success: true,
        message: 'File processed successfully',
        data: results
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }
      next(error);
    }
  }
);

// @desc    Download Excel file with group expenses
// @route   GET /api/expenses/:groupId/download
// @access  Private
router.get('/:groupId/download',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const { startDate, endDate } = req.query;
      
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
          message: 'Not authorized to download expenses for this group'
        });
      }
      
      // Get expenses
      const result = await Expense.getGroupExpenses(groupId, {
        startDate,
        endDate,
        limit: 10000 // Large limit to get all expenses
      });
      
      // Prepare data for Excel
      const excelData = [];
      
      for (const expense of result.expenses) {
        const splits = await Split.find({ expenseId: expense._id })
          .populate('userId', 'firstName lastName email');
        
        excelData.push({
          'Date': expense.createdAt.toISOString().split('T')[0],
          'Description': expense.description,
          'Amount': parseFloat(expense.amount.toString()),
          'Currency': expense.currency,
          'Category': expense.category,
          'Payer Name': expense.payerId.firstName + ' ' + expense.payerId.lastName,
          'Payer Email': expense.payerId.email,
          'Added By': expense.addedBy.firstName + ' ' + expense.addedBy.lastName,
          'Split Members': splits.map(s => s.userId.email).join(', '),
          'Split Amounts': splits.map(s => parseFloat(s.shareAmount.toString())).join(', '),
          'Note': expense.note || ''
        });
      }
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
      
      // Generate filename
      const filename = `${group.title.replace(/[^a-zA-Z0-9]/g, '_')}_expenses_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write workbook to response
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;