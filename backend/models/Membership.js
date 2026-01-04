const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required']
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: false, updatedAt: true }
});

// Compound index to ensure unique membership
membershipSchema.index({ userId: 1, groupId: 1 }, { unique: true });

// Indexes for queries
membershipSchema.index({ userId: 1 });
membershipSchema.index({ groupId: 1 });
membershipSchema.index({ isAdmin: 1 });

// Static method to add member to group
membershipSchema.statics.addMember = async function(groupId, userId, isAdmin = false) {
  return await this.findOneAndUpdate(
    { groupId, userId },
    { isAdmin, updatedAt: new Date() },
    { upsert: true, new: true }
  );
};

// Static method to remove member from group
membershipSchema.statics.removeMember = async function(groupId, userId) {
  return await this.findOneAndDelete({ groupId, userId });
};

// Static method to get group members
membershipSchema.statics.getGroupMembers = async function(groupId) {
  return await this.find({ groupId })
    .populate('userId', 'firstName lastName username email profilePhoto')
    .sort({ isAdmin: -1, updatedAt: -1 });
};

// Static method to get user's groups
membershipSchema.statics.getUserGroups = async function(userId) {
  return await this.find({ userId })
    .populate('groupId')
    .sort({ updatedAt: -1 });
};

// Pre-remove middleware to clean up related data
membershipSchema.pre('findOneAndDelete', async function() {
  const membership = await this.model.findOne(this.getQuery());
  if (membership) {
    // Log the membership removal for audit purposes
    const ActivityLog = mongoose.model('ActivityLog');
    await ActivityLog.create({
      userId: membership.userId,
      groupId: membership.groupId,
      action: 'member_removed',
      details: {
        removedUserId: membership.userId,
        wasAdmin: membership.isAdmin
      }
    });
  }
});

module.exports = mongoose.model('Membership', membershipSchema);