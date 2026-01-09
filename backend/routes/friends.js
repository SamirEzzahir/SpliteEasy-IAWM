const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const friendController = require('../controllers/friendController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user's friends
// @route   GET /api/friends/my
// @access  Private
router.get('/my', friendController.getMyFriends);

// @desc    Search users for friend requests
// @route   GET /api/friends/search
// @access  Private
router.get('/search', friendController.searchUsers);

// @desc    Send friend request
// @route   POST /api/friends/request/:friendId
// @access  Private
router.post('/request/:friendId', 
  friendController.sendFriendRequest
);

// @desc    Get received friend requests
// @route   GET /api/friends/requests/received
// @access  Private
router.get('/requests/received', friendController.getReceivedRequests);

// @desc    Get sent friend requests
// @route   GET /api/friends/requests/sent
// @access  Private
router.get('/requests/sent', friendController.getSentRequests);

// @desc    Accept friend request
// @route   POST /api/friends/request/:requestId/accept
// @access  Private
router.post('/request/:requestId/accept', 
  validate(schemas.objectId, 'params'), 
  friendController.acceptFriendRequest
);

// @desc    Reject friend request
// @route   POST /api/friends/request/:requestId/reject
// @access  Private
router.post('/request/:requestId/reject', 
  validate(schemas.objectId, 'params'), 
  friendController.rejectFriendRequest
);

// @desc    Cancel friend request
// @route   POST /api/friends/request/:requestId/cancel
// @access  Private
router.post('/request/:requestId/cancel', 
  validate(schemas.objectId, 'params'), 
  friendController.cancelFriendRequest
);

// @desc    Remove friend
// @route   DELETE /api/friends/remove/:friendshipId
// @access  Private
router.delete('/remove/:friendshipId', 
  validate(schemas.objectId, 'params'), 
  friendController.removeFriend
);

module.exports = router;