const express = require('express');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get current user (alternative endpoint)
// @route   GET /api/users/user/me
// @access  Private
router.get('/user/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('roleId', 'name permissions')
      .select('-passwordHash');

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
router.get('/', authorize('admin', 'user:read'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    
    const query = {};
    
    // Search by name, username, or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by active status
    if (typeof isActive === 'string') {
      query.isActive = isActive === 'true';
    }
    
    const users = await User.find(query)
      .populate('roleId', 'name permissions')
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', validate(schemas.objectId, 'params'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('roleId', 'name permissions')
      .select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Users can only view their own profile unless they're admin
    if (req.user._id.toString() !== req.params.id && !req.user.roleId.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this user'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
router.put('/:id', 
  validate(schemas.objectId, 'params'),
  validate(schemas.userUpdate),
  async (req, res, next) => {
    try {
      // Check if user can update this profile
      if (req.user._id.toString() !== req.params.id && !req.user.roleId.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this user'
        });
      }
      
      const allowedFields = ['firstName', 'lastName', 'phone', 'gender', 'globalSettlementMode'];
      const updates = {};
      
      // Only include allowed fields
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      ).populate('roleId', 'name permissions').select('-passwordHash');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Deactivate user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete('/:id', 
  authorize('admin'),
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      ).select('-passwordHash');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Log activity
      await ActivityLog.logActivity({
        userId: req.user._id,
        action: 'user_deactivated',
        details: { 
          deactivatedUserId: user._id,
          username: user.username,
          email: user.email
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get user activity
// @route   GET /api/users/:id/activity
// @access  Private (Admin or own profile)
router.get('/:id/activity',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      // Check if user can view this activity
      if (req.user._id.toString() !== req.params.id && !req.user.roleId.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user activity'
        });
      }
      
      const { page = 1, limit = 20, action, groupId } = req.query;
      
      const result = await ActivityLog.getUserActivity(req.params.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        groupId
      });
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Private
router.get('/search/:query', async (req, res, next) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;
    
    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .select('firstName lastName username email profilePhoto')
    .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;