const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required']
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'From user ID is required']
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'To user ID is required']
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [200, 'Message cannot exceed 200 characters']
  },
  proofPhoto: {
    type: String,
    default: null
  },
  rejectedReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Rejected reason cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: { transform: transformDecimal },
  toObject: { transform: transformDecimal }
});

// Transform function to convert Decimal128 to number
function transformDecimal(doc, ret) {
  if (ret.amount) {
    ret.amount = parseFloat(ret.amount.toString());
  }
  return ret;
}

// Indexes
settlementSchema.index({ groupId: 1, status: 1 });
settlementSchema.index({ fromUserId: 1 });
settlementSchema.index({ toUserId: 1 });
settlementSchema.index({ createdAt: -1 });

// Validation to prevent self-settlement
settlementSchema.pre('save', function(next) {
  if (this.fromUserId.toString() === this.toUserId.toString()) {
    return next(new Error('Cannot create settlement to yourself'));
  }
  next();
});

// Instance method to accept settlement
settlementSchema.methods.accept = async function(acceptedBy) {
  if (this.toUserId.toString() !== acceptedBy.toString()) {
    throw new Error('Only the recipient can accept this settlement');
  }
  
  if (this.status !== 'pending') {
    throw new Error('Settlement is not in pending status');
  }
  
  this.status = 'accepted';
  await this.save();
  
  // Create activity log
  const ActivityLog = mongoose.model('ActivityLog');
  await ActivityLog.create({
    userId: acceptedBy,
    groupId: this.groupId,
    action: 'settlement_accepted',
    details: {
      settlementId: this._id,
      fromUserId: this.fromUserId,
      amount: parseFloat(this.amount.toString())
    }
  });
  
  return this;
};

// Instance method to reject settlement
settlementSchema.methods.reject = async function(rejectedBy, reason) {
  if (this.toUserId.toString() !== rejectedBy.toString()) {
    throw new Error('Only the recipient can reject this settlement');
  }
  
  if (this.status !== 'pending') {
    throw new Error('Settlement is not in pending status');
  }
  
  this.status = 'rejected';
  this.rejectedReason = reason;
  await this.save();
  
  // Create activity log
  const ActivityLog = mongoose.model('ActivityLog');
  await ActivityLog.create({
    userId: rejectedBy,
    groupId: this.groupId,
    action: 'settlement_rejected',
    details: {
      settlementId: this._id,
      fromUserId: this.fromUserId,
      amount: parseFloat(this.amount.toString()),
      reason
    }
  });
  
  return this;
};

// Static method to get suggested settlements for a group
settlementSchema.statics.getSuggestedSettlements = async function(groupId) {
  const Split = mongoose.model('Split');
  const balances = await Split.getGroupBalances(groupId);
  
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
  
  const settlements = [];
  let i = 0, j = 0;
  
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    
    const settleAmount = Math.min(creditor.balance, Math.abs(debtor.balance));
    
    if (settleAmount > 0.01) {
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: Math.round(settleAmount * 100) / 100,
        fromUser: debtor.user,
        toUser: creditor.user
      });
      
      creditor.balance -= settleAmount;
      debtor.balance += settleAmount;
    }
    
    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }
  
  return settlements;
};

// Static method to get group settlements with pagination
settlementSchema.statics.getGroupSettlements = async function(groupId, options = {}) {
  const { page = 1, limit = 20, status } = options;
  
  const query = { groupId };
  if (status) query.status = status;
  
  const settlements = await this.find(query)
    .populate('fromUserId', 'firstName lastName username')
    .populate('toUserId', 'firstName lastName username')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await this.countDocuments(query);
  
  return {
    settlements,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    totalSettlements: total
  };
};

module.exports = mongoose.model('Settlement', settlementSchema);