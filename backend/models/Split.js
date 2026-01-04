const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: [true, 'Expense ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  shareAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Share amount is required'],
    min: [0, 'Share amount cannot be negative']
  }
}, {
  timestamps: { createdAt: false, updatedAt: true },
  toJSON: { transform: transformDecimal },
  toObject: { transform: transformDecimal }
});

// Transform function to convert Decimal128 to number
function transformDecimal(doc, ret) {
  if (ret.shareAmount) {
    ret.shareAmount = parseFloat(ret.shareAmount.toString());
  }
  return ret;
}

// Compound index to ensure unique split per user per expense
splitSchema.index({ expenseId: 1, userId: 1 }, { unique: true });

// Indexes for queries
splitSchema.index({ expenseId: 1 });
splitSchema.index({ userId: 1 });

// Static method to create splits for an expense
splitSchema.statics.createSplits = async function(expenseId, splits) {
  // Remove existing splits for this expense
  await this.deleteMany({ expenseId });
  
  // Create new splits
  const splitDocs = splits.map(split => ({
    expenseId,
    userId: split.userId,
    shareAmount: split.shareAmount
  }));
  
  return await this.insertMany(splitDocs);
};

// Static method to get user's splits for a group
splitSchema.statics.getUserGroupSplits = async function(userId, groupId) {
  return await this.find({ userId })
    .populate({
      path: 'expenseId',
      match: { groupId },
      populate: {
        path: 'payerId',
        select: 'firstName lastName username'
      }
    })
    .populate('userId', 'firstName lastName username');
};

// Static method to calculate user balance in a group
splitSchema.statics.calculateUserBalance = async function(userId, groupId) {
  const Expense = mongoose.model('Expense');
  
  // Get all expenses paid by user in the group
  const paidExpenses = await Expense.find({ 
    groupId, 
    payerId: userId 
  }).select('amount');
  
  const totalPaid = paidExpenses.reduce((sum, expense) => {
    return sum + parseFloat(expense.amount.toString());
  }, 0);
  
  // Get all splits for user in the group
  const userSplits = await this.find({ userId })
    .populate({
      path: 'expenseId',
      match: { groupId },
      select: 'amount'
    });
  
  const totalOwed = userSplits.reduce((sum, split) => {
    if (split.expenseId) {
      return sum + parseFloat(split.shareAmount.toString());
    }
    return sum;
  }, 0);
  
  return {
    totalPaid,
    totalOwed,
    balance: totalPaid - totalOwed // Positive means user is owed money
  };
};

// Static method to get group balance summary
splitSchema.statics.getGroupBalances = async function(groupId) {
  const Membership = mongoose.model('Membership');
  const members = await Membership.getGroupMembers(groupId);
  
  const balances = await Promise.all(
    members.map(async (member) => {
      const balance = await this.calculateUserBalance(member.userId._id, groupId);
      return {
        userId: member.userId._id,
        user: member.userId,
        ...balance
      };
    })
  );
  
  return balances;
};

module.exports = mongoose.model('Split', splitSchema);