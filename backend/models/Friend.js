const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  friendId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });
friendSchema.index({ userId: 1, status: 1 });
friendSchema.index({ friendId: 1, status: 1 });
friendSchema.index({ requestedBy: 1, status: 1 });

// Static method to send friend request
friendSchema.statics.sendRequest = async function(fromUserId, toUserId) {
  // Check if friendship already exists
  const existing = await this.findOne({
    $or: [
      { userId: fromUserId, friendId: toUserId },
      { userId: toUserId, friendId: fromUserId }
    ]
  });

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error('You are already friends with this user');
    } else if (existing.status === 'pending') {
      throw new Error('Friend request already sent');
    } else if (existing.status === 'blocked') {
      throw new Error('Cannot send friend request to this user');
    }
  }

  // Create new friend request
  return await this.create({
    userId: fromUserId,
    friendId: toUserId,
    requestedBy: fromUserId,
    status: 'pending'
  });
};

// Static method to accept friend request
friendSchema.statics.acceptRequest = async function(requestId, userId) {
  const request = await this.findById(requestId);
  
  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.friendId.toString() !== userId.toString()) {
    throw new Error('Not authorized to accept this request');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is no longer pending');
  }

  // Update the request
  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  return request;
};

// Static method to reject friend request
friendSchema.statics.rejectRequest = async function(requestId, userId) {
  const request = await this.findById(requestId);
  
  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.friendId.toString() !== userId.toString()) {
    throw new Error('Not authorized to reject this request');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is no longer pending');
  }

  // Update the request
  request.status = 'rejected';
  request.respondedAt = new Date();
  await request.save();

  return request;
};

// Static method to get user's friends
friendSchema.statics.getUserFriends = async function(userId) {
  const friendships = await this.find({
    $or: [
      { userId: userId, status: 'accepted' },
      { friendId: userId, status: 'accepted' }
    ]
  })
  .populate('userId', 'username email firstName lastName profilePhoto')
  .populate('friendId', 'username email firstName lastName profilePhoto');

  return friendships.map(friendship => {
    // Get the friend (the other person in the friendship)
    const friend = friendship.userId._id.toString() === userId.toString() 
      ? friendship.friendId 
      : friendship.userId;
    
    return {
      friendship_id: friendship._id,
      id: friend._id,
      username: friend.username,
      email: friend.email,
      firstName: friend.firstName,
      lastName: friend.lastName,
      profilePhoto: friend.profilePhoto,
      created_at: friendship.createdAt
    };
  });
};

// Static method to get received requests
friendSchema.statics.getReceivedRequests = async function(userId) {
  return await this.find({
    friendId: userId,
    status: 'pending'
  })
  .populate('userId', 'username email firstName lastName profilePhoto')
  .sort({ createdAt: -1 });
};

// Static method to get sent requests
friendSchema.statics.getSentRequests = async function(userId) {
  return await this.find({
    userId: userId,
    status: 'pending'
  })
  .populate('friendId', 'username email firstName lastName profilePhoto')
  .sort({ createdAt: -1 });
};

// Static method to remove friendship
friendSchema.statics.removeFriendship = async function(friendshipId, userId) {
  const friendship = await this.findById(friendshipId);
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }

  // Check if user is part of this friendship
  if (friendship.userId.toString() !== userId.toString() && 
      friendship.friendId.toString() !== userId.toString()) {
    throw new Error('Not authorized to remove this friendship');
  }

  await this.findByIdAndDelete(friendshipId);
  return true;
};

// Static method to cancel request
friendSchema.statics.cancelRequest = async function(requestId, userId) {
  const request = await this.findById(requestId);
  
  if (!request) {
    throw new Error('Friend request not found');
  }

  if (request.userId.toString() !== userId.toString()) {
    throw new Error('Not authorized to cancel this request');
  }

  if (request.status !== 'pending') {
    throw new Error('Request is no longer pending');
  }

  await this.findByIdAndDelete(requestId);
  return true;
};

module.exports = mongoose.model('Friend', friendSchema);