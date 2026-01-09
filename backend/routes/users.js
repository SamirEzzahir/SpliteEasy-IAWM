const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const userController = require('../controllers/userController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get current user (alternative endpoint)
// @route   GET /api/users/user/me
// @access  Private
router.get('/user/me', userController.getCurrentUser);

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', authorize('admin', 'user:read'), userController.getAllUsers);

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', validate(schemas.objectId, 'params'), userController.getUserById);

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
router.put('/:id', 
  validate(schemas.objectId, 'params'),
  validate(schemas.userUpdate),
  userController.updateUser
);

// @desc    Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('admin'),
  validate(schemas.objectId, 'params'),
  userController.deactivateUser
);

// @desc    Get user activity
// @route   GET /api/users/:id/activity
// @access  Private (Admin or own profile)
router.get('/:id/activity',
  validate(schemas.objectId, 'params'),
  userController.getUserActivity
);

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Private
router.get('/search/:query', userController.searchUsers);

module.exports = router;