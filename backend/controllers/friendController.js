const Friend = require('../models/Friend');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Get user's friends
 * @route   GET /api/friends/my
 * @access  Private
 */
const getMyFriends = async (req, res, next) => {
  try {
    const friends = await Friend.getUserFriends(req.user._id);
    
    res.status(200).json(friends);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search users for friend requests
 * @route   GET /api/friends/search
 * @access  Private
 */
const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    // Search users by username, email, or phone
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { isActive: true },
        {
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('username email firstName lastName phone profilePhoto')
    .limit(10);
    
    // Filter out users who are already friends or have pending requests
    const existingFriendships = await Friend.find({
      $or: [
        { userId: req.user._id, friendId: { $in: users.map(u => u._id) } },
        { friendId: req.user._id, userId: { $in: users.map(u => u._id) } }
      ]
    });
    
    const existingUserIds = existingFriendships.map(f => 
      f.userId.toString() === req.user._id.toString() ? f.friendId.toString() : f.userId.toString()
    );
    
    const availableUsers = users.filter(user => 
      !existingUserIds.includes(user._id.toString())
    );
    
    res.status(200).json(availableUsers);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send friend request
 * @route   POST /api/friends/request/:userId
 * @access  Private
 */
const sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }
    
    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Send friend request
    const request = await Friend.sendRequest(req.user._id, userId);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'friend_request_sent',
      details: {
        targetUserId: userId,
        targetUsername: targetUser.username
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      data: { request }
    });
  } catch (error) {
    if (error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Get received friend requests
 * @route   GET /api/friends/requests/received
 * @access  Private
 */
const getReceivedRequests = async (req, res, next) => {
  try {
    const requests = await Friend.getReceivedRequests(req.user._id);
    
    const formattedRequests = requests.map(request => ({
      id: request._id,
      friendship_id: request._id,
      username: request.userId.username,
      user_email: request.userId.email,
      email: request.userId.email,
      firstName: request.userId.firstName,
      lastName: request.userId.lastName,
      profilePhoto: request.userId.profilePhoto,
      created_at: request.createdAt
    }));
    
    res.status(200).json(formattedRequests);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get sent friend requests
 * @route   GET /api/friends/requests/sent
 * @access  Private
 */
const getSentRequests = async (req, res, next) => {
  try {
    const requests = await Friend.getSentRequests(req.user._id);
    
    const formattedRequests = requests.map(request => ({
      id: request._id,
      friendship_id: request._id,
      username: request.friendId.username,
      friend_email: request.friendId.email,
      email: request.friendId.email,
      firstName: request.friendId.firstName,
      lastName: request.friendId.lastName,
      profilePhoto: request.friendId.profilePhoto,
      created_at: request.createdAt
    }));
    
    res.status(200).json(formattedRequests);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept friend request
 * @route   POST /api/friends/request/:requestId/accept
 * @access  Private
 */
const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    const request = await Friend.acceptRequest(requestId, req.user._id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'friend_request_accepted',
      details: {
        requestId,
        fromUserId: request.userId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      data: { request }
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Reject friend request
 * @route   POST /api/friends/request/:requestId/reject
 * @access  Private
 */
const rejectFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    const request = await Friend.rejectRequest(requestId, req.user._id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'friend_request_rejected',
      details: {
        requestId,
        fromUserId: request.userId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Friend request rejected',
      data: { request }
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Cancel friend request
 * @route   POST /api/friends/request/:requestId/cancel
 * @access  Private
 */
const cancelFriendRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    await Friend.cancelRequest(requestId, req.user._id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'friend_request_cancelled',
      details: { requestId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Remove friend
 * @route   DELETE /api/friends/remove/:friendshipId
 * @access  Private
 */
const removeFriend = async (req, res, next) => {
  try {
    const { friendshipId } = req.params;
    
    await Friend.removeFriendship(friendshipId, req.user._id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'friend_removed',
      details: { friendshipId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('authorized')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getMyFriends,
  searchUsers,
  sendFriendRequest,
  getReceivedRequests,
  getSentRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend
};