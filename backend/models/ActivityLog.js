const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'user_registered',
      'user_login',
      'group_created',
      'group_updated',
      'group_deleted',
      'member_added',
      'member_removed',
      'expense_created',
      'expense_updated',
      'expense_deleted',
      'settlement_created',
      'settlement_accepted',
      'settlement_rejected',
      'global_settlement_created',
      'global_settlement_accepted',
      'global_settlement_rejected',
      'wallet_created',
      'wallet_updated',
      'wallet_deleted',
      'wallet_transfer'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ groupId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Static method to get user activity
activityLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const { page = 1, limit = 20, action, groupId } = options;
  
  const query = { userId };
  if (action) query.action = action;
  if (groupId) query.groupId = groupId;
  
  const activities = await this.find(query)
    .populate('groupId', 'title')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await this.countDocuments(query);
  
  return {
    activities,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    totalActivities: total
  };
};

// Static method to get group activity
activityLogSchema.statics.getGroupActivity = async function(groupId, options = {}) {
  const { page = 1, limit = 20, action } = options;
  
  const query = { groupId };
  if (action) query.action = action;
  
  const activities = await this.find(query)
    .populate('userId', 'firstName lastName username')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await this.countDocuments(query);
  
  return {
    activities,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    totalActivities: total
  };
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);