const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const groupController = require('../controllers/groupController');
const Group = require('../models/Group');
const User = require('../models/User');
const Membership = require('../models/Membership');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Create group
// @route   POST /api/groups
// @access  Private
router.post('/', validate(schemas.groupCreate), groupController.createGroup);

// @desc    Get user's groups
// @route   GET /api/groups
// @access  Private
router.get('/', groupController.getUserGroups);

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
router.get('/:id', validate(schemas.idParam, 'params'), groupController.getGroupById);

// @desc    Get group members
// @route   GET /api/groups/:id/members
// @access  Private
router.get('/:id/members', validate(schemas.idParam, 'params'), groupController.getGroupMembers);

// @desc    Check if user can leave group
// @route   GET /api/groups/:id/can_leave
// @access  Private
router.get('/:id/can_leave', validate(schemas.idParam, 'params'), groupController.canLeaveGroup);

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
router.put('/:id',
  validate(schemas.idParam, 'params'),
  validate(schemas.groupUpdate),
  groupController.updateGroup
);

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (Owner only)
router.delete('/:id', validate(schemas.idParam, 'params'), groupController.deleteGroup);

// @desc    Add member to group
// @route   POST /api/groups/:id/members
// @access  Private (Admin only)
router.post('/:id/members',
  validate(schemas.idParam, 'params'),
  groupController.addMember
);

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private (Admin only)
router.delete('/:id/members/:userId',
  validate(schemas.idParam, 'params'),
  groupController.removeMember
);

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
router.post('/:id/leave', validate(schemas.idParam, 'params'), groupController.leaveGroup);

// @desc    Add multiple members to group (frontend compatibility)
// @route   POST /api/groups/:id/add_members
// @access  Private (Admin only)
router.post('/:id/add_members',
  validate(schemas.idParam, 'params'),
  async (req, res, next) => {
    try {
      const { user_ids, is_admin = false } = req.body;
      
      if (!user_ids || !Array.isArray(user_ids)) {
        return res.status(400).json({
          success: false,
          message: 'user_ids array is required'
        });
      }
      
      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      // Check if current user is admin
      const isCurrentUserAdmin = await group.isAdmin(req.user._id);
      if (!isCurrentUserAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only group admins can add members'
        });
      }
      
      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };
      
      // Add each user
      for (const userId of user_ids) {
        try {
          // Check if user exists
          const userToAdd = await User.findById(userId);
          if (!userToAdd) {
            results.failed++;
            results.errors.push(`User ${userId} not found`);
            continue;
          }
          
          // Add member
          await Membership.addMember(group._id, userId, is_admin);
          results.successful++;
        } catch (error) {
          if (error.code === 11000) {
            results.failed++;
            results.errors.push(`User ${userId} is already a member`);
          } else {
            results.failed++;
            results.errors.push(`Failed to add user ${userId}: ${error.message}`);
          }
        }
      }
      
      res.status(200).json({
        success: true,
        message: `Added ${results.successful} members successfully`,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;