const mongoose = require('mongoose');

const globalSettlementSchema = new mongoose.Schema({
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
globalSettlementSchema.index({ fromUserId: 1 });
globalSettlementSchema.index({ toUserId: 1 });
globalSettlementSchema.index({ status: 1 });
globalSettlementSchema.index({ createdAt: -1 });

// Validation to prevent self-settlement
globalSettlementSchema.pre('save', function(next) {
  if (this.fromUserId.toString() === this.toUserId.toString()) {
    return next(new Error('Cannot create settlement to yourself'));
  }
  next();
});

// Instance method to accept settlement
globalSettlementSchema.methods.accept = async function(acceptedBy) {
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
    action: 'global_settlement_accepted',
    details: {
      settlementId: this._id,
      fromUserId: this.fromUserId,
      amount: parseFloat(this.amount.toString())
    }
  });
  
  return this;
};

// Instance method to reject settlement
globalSettlementSchema.methods.reject = async function(rejectedBy, reason) {
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
    action: 'global_settlement_rejected',
    details: {
      settlementId: this._id,
      fromUserId: this.fromUserId,
      amount: parseFloat(this.amount.toString()),
      reason
    }
  });
  
  return this;
};

// Static method to calculate global balances for a user
globalSettlementSchema.statics.calculateGlobalBalances = async function(userId) {
  const Split = mongoose.model('Split');
  const Membership = mongoose.model('Membership');
  
  // Get all groups user is member of
  const memberships = await Membership.find({ userId });
  const groupIds = memberships.map(m => m.groupId);
  
  const globalBalances = new Map();
  
  // Calculate balances for each group
  for (const groupId of groupIds) {
    const groupBalances = await Split.getGroupBalances(groupId);
    
    groupBalances.forEach(balance => {
      if (balance.userId.toString() !== userId.toString()) {
        const otherUserId = balance.userId.toString();
        const currentBalance = globalBalances.get(otherUserId) || 0;
        
        // If current user owes money in this group, it's negative
        // If current user is owed money in this group, it's positive
        const userBalance = groupBalances.find(b => b.userId.toString() === userId.toString());
        if (userBalance) {
          const netBalance = userBalance.balance - balance.balance;
          globalBalances.set(otherUserId, currentBalance + netBalance);
        }
      }
    });
  }
  
  // Convert to array and filter out zero balances
  const result = [];
  for (const [otherUserId, balance] of globalBalances) {
    if (Math.abs(balance) > 0.01) {
      const User = mongoose.model('User');
      const otherUser = await User.findById(otherUserId).select('firstName lastName username');
      
      result.push({
        userId: otherUserId,
        user: otherUser,
        balance: Math.round(balance * 100) / 100
      });
    }
  }
  
  return result.sort((a, b) => b.balance - a.balance);
};

// Static method to get suggested global settlements
globalSettlementSchema.statics.getSuggestedGlobalSettlements = async function(userId) {
  const balances = await this.calculateGlobalBalances(userId);
  
  const settlements = [];
  
  balances.forEach(balance => {
    if (balance.balance < -0.01) {
      // User owes money to this person
      settlements.push({
        fromUserId: userId,
        toUserId: balance.userId,
        amount: Math.abs(balance.balance),
        toUser: balance.user
      });
    }
  });
  
  return settlements;
};

module.exports = mongoose.model('GlobalSettlement', globalSettlementSchema);