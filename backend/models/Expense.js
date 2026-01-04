const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required']
  },
  payerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer ID is required']
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Added by user ID is required']
  },
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'USD',
    length: [3, 'Currency must be 3 characters'],
    uppercase: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: 'General'
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    default: null
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage'],
    default: 'equal'
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  photo: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: transformDecimal },
  toObject: { virtuals: true, transform: transformDecimal }
});

// Transform function to convert Decimal128 to number
function transformDecimal(doc, ret) {
  if (ret.amount) {
    ret.amount = parseFloat(ret.amount.toString());
  }
  return ret;
}

// Indexes
expenseSchema.index({ groupId: 1, createdAt: -1 });
expenseSchema.index({ payerId: 1 });
expenseSchema.index({ addedBy: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ createdAt: -1 });

// Virtual for splits
expenseSchema.virtual('splits', {
  ref: 'Split',
  localField: '_id',
  foreignField: 'expenseId'
});

// Virtual for total split amount
expenseSchema.virtual('totalSplitAmount').get(function() {
  if (this.splits && this.splits.length > 0) {
    return this.splits.reduce((total, split) => {
      return total + parseFloat(split.shareAmount.toString());
    }, 0);
  }
  return 0;
});

// Instance method to calculate equal splits
expenseSchema.methods.calculateEqualSplits = function(memberIds) {
  const amount = parseFloat(this.amount.toString());
  const splitAmount = amount / memberIds.length;
  
  return memberIds.map(memberId => ({
    userId: memberId,
    shareAmount: splitAmount
  }));
};

// Instance method to validate splits
expenseSchema.methods.validateSplits = function(splits) {
  const totalAmount = parseFloat(this.amount.toString());
  const totalSplitAmount = splits.reduce((sum, split) => sum + split.shareAmount, 0);
  
  // Allow small rounding differences (up to 1 cent)
  const difference = Math.abs(totalAmount - totalSplitAmount);
  return difference < 0.01;
};

// Static method to get group expenses with pagination
expenseSchema.statics.getGroupExpenses = async function(groupId, options = {}) {
  const {
    page = 1,
    limit = 20,
    category,
    payerId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const query = { groupId };
  
  if (category) query.category = category;
  if (payerId) query.payerId = payerId;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const expenses = await this.find(query)
    .populate('payerId', 'firstName lastName username')
    .populate('addedBy', 'firstName lastName username')
    .populate('walletId', 'name category')
    .populate('splits')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await this.countDocuments(query);

  return {
    expenses,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    totalExpenses: total
  };
};

// Pre-save middleware to set default values
expenseSchema.pre('save', function(next) {
  if (!this.addedBy) {
    this.addedBy = this.payerId;
  }
  next();
});

// Post-save middleware to create activity log
expenseSchema.post('save', async function(doc) {
  try {
    const ActivityLog = mongoose.model('ActivityLog');
    await ActivityLog.create({
      userId: doc.addedBy,
      groupId: doc.groupId,
      action: 'expense_created',
      details: {
        expenseId: doc._id,
        description: doc.description,
        amount: parseFloat(doc.amount.toString()),
        currency: doc.currency
      }
    });
  } catch (error) {
    console.error('Error creating activity log:', error);
  }
});

module.exports = mongoose.model('Expense', expenseSchema);