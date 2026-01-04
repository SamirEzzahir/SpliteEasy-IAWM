const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Group title is required'],
    trim: true,
    maxlength: [100, 'Group title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Group owner is required']
  },
  type: {
    type: String,
    default: 'Other',
    maxlength: [50, 'Type cannot exceed 50 characters']
  },
  photo: {
    type: String,
    default: null
  },
  currency: {
    type: String,
    default: 'USD',
    length: [3, 'Currency must be 3 characters'],
    uppercase: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
groupSchema.index({ ownerId: 1 });
groupSchema.index({ title: 1 });
groupSchema.index({ createdAt: -1 });

// Virtual for member count
groupSchema.virtual('memberCount', {
  ref: 'Membership',
  localField: '_id',
  foreignField: 'groupId',
  count: true
});

// Virtual for members
groupSchema.virtual('members', {
  ref: 'Membership',
  localField: '_id',
  foreignField: 'groupId'
});

// Virtual for expenses
groupSchema.virtual('expenses', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'groupId'
});

// Instance method to check if user is member
groupSchema.methods.isMember = async function(userId) {
  const Membership = mongoose.model('Membership');
  const membership = await Membership.findOne({
    groupId: this._id,
    userId: userId
  });
  return !!membership;
};

// Instance method to check if user is admin
groupSchema.methods.isAdmin = async function(userId) {
  const Membership = mongoose.model('Membership');
  const membership = await Membership.findOne({
    groupId: this._id,
    userId: userId,
    isAdmin: true
  });
  return !!membership || this.ownerId.toString() === userId.toString();
};

// Static method to get user groups
groupSchema.statics.getUserGroups = async function(userId) {
  const Membership = mongoose.model('Membership');
  
  const memberships = await Membership.find({ userId })
    .populate({
      path: 'groupId',
      populate: {
        path: 'ownerId',
        select: 'firstName lastName username'
      }
    });
  
  return memberships.map(membership => ({
    ...membership.groupId.toObject(),
    isAdmin: membership.isAdmin,
    membershipUpdatedAt: membership.updatedAt
  }));
};

module.exports = mongoose.model('Group', groupSchema);