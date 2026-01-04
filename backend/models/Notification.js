const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: [
      'expense_added',
      'expense_updated',
      'expense_deleted',
      'settlement_request',
      'settlement_accepted',
      'settlement_rejected',
      'group_invitation',
      'member_added',
      'member_removed',
      'payment_reminder',
      'system'
    ]
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  relatedModel: {
    type: String,
    enum: ['Expense', 'Settlement', 'GlobalSettlement', 'Group', 'User'],
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const { page = 1, limit = 20, isRead, type } = options;
  
  const query = { userId };
  if (typeof isRead === 'boolean') query.isRead = isRead;
  if (type) query.type = type;
  
  const notifications = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
  
  const total = await this.countDocuments(query);
  const unreadCount = await this.countDocuments({ userId, isRead: false });
  
  return {
    notifications,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    totalNotifications: total,
    unreadCount
  };
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to create expense notification
notificationSchema.statics.createExpenseNotification = async function(expense, action = 'added') {
  const Membership = mongoose.model('Membership');
  const members = await Membership.getGroupMembers(expense.groupId);
  
  const notifications = members
    .filter(member => member.userId._id.toString() !== expense.addedBy.toString())
    .map(member => ({
      userId: member.userId._id,
      title: `New expense ${action}`,
      message: `${expense.description} - $${parseFloat(expense.amount.toString()).toFixed(2)}`,
      type: `expense_${action}`,
      relatedId: expense._id,
      relatedModel: 'Expense'
    }));
  
  if (notifications.length > 0) {
    await this.insertMany(notifications);
  }
};

// Static method to create settlement notification
notificationSchema.statics.createSettlementNotification = async function(settlement, action = 'request') {
  const notificationData = {
    userId: settlement.toUserId,
    relatedId: settlement._id,
    relatedModel: settlement.groupId ? 'Settlement' : 'GlobalSettlement'
  };
  
  switch (action) {
    case 'request':
      notificationData.title = 'Settlement Request';
      notificationData.message = `You have a settlement request for $${parseFloat(settlement.amount.toString()).toFixed(2)}`;
      notificationData.type = 'settlement_request';
      break;
    case 'accepted':
      notificationData.userId = settlement.fromUserId;
      notificationData.title = 'Settlement Accepted';
      notificationData.message = `Your settlement request for $${parseFloat(settlement.amount.toString()).toFixed(2)} was accepted`;
      notificationData.type = 'settlement_accepted';
      break;
    case 'rejected':
      notificationData.userId = settlement.fromUserId;
      notificationData.title = 'Settlement Rejected';
      notificationData.message = `Your settlement request for $${parseFloat(settlement.amount.toString()).toFixed(2)} was rejected`;
      notificationData.type = 'settlement_rejected';
      break;
  }
  
  await this.create(notificationData);
};

module.exports = mongoose.model('Notification', notificationSchema);