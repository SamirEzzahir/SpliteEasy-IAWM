const Group = require('../models/Group');
const Membership = require('../models/Membership');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

/**
 * @desc    Create group
 * @route   POST /api/groups
 * @access  Private
 */
const createGroup = async (req, res, next) => {
  try {
    const { title, description, type, currency, member_ids } = req.body;
    
    // Create group
    const group = await Group.create({
      title,
      description,
      type,
      currency,
      ownerId: req.user._id
    });
    
    // Add creator as admin member
    await Membership.addMember(group._id, req.user._id, true);
    
    // Add other members if provided
    if (member_ids && member_ids.length > 0) {
      // Filter out invalid IDs (undefined, null, empty strings)
      const validMemberIds = member_ids.filter(id => 
        id && 
        typeof id === 'string' && 
        id !== 'undefined' && 
        id.match(/^[0-9a-fA-F]{24}$/)
      );
      
      for (const memberId of validMemberIds) {
        try {
          await Membership.addMember(group._id, memberId, false);
        } catch (error) {
          console.log(`Failed to add member ${memberId}:`, error.message);
          // Continue with other members even if one fails
        }
      }
    }
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: group._id,
      action: 'group_created',
      details: { title, type, currency, memberCount: (member_ids?.length || 0) + 1 },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Populate owner info
    const populatedGroup = await Group.findById(group._id)
      .populate('ownerId', 'firstName lastName username');
    
    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: { group: populatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's groups
 * @route   GET /api/groups
 * @access  Private
 */
const getUserGroups = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const memberships = await Membership.find({ userId: req.user._id })
      .populate({
        path: 'groupId',
        populate: {
          path: 'ownerId',
          select: 'firstName lastName username'
        }
      })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const groups = memberships.map(membership => ({
      ...membership.groupId.toObject(),
      isAdmin: membership.isAdmin,
      membershipUpdatedAt: membership.updatedAt
    }));
    
    // Return direct array (like Python version)
    res.status(200).json(groups);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group by ID
 * @route   GET /api/groups/:id
 * @access  Private
 */
const getGroupById = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('ownerId', 'firstName lastName username profilePhoto');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group'
      });
    }
    
    // Get members (like Python version includes members in group object)
    const memberships = await Membership.getGroupMembers(group._id);
    
    // Transform to match frontend expectations
    const members = memberships.map(membership => ({
      user_id: membership.userId._id,
      username: membership.userId.username,
      firstName: membership.userId.firstName,
      lastName: membership.userId.lastName,
      email: membership.userId.email,
      profilePhoto: membership.userId.profilePhoto,
      isAdmin: membership.isAdmin,
      updatedAt: membership.updatedAt
    }));
    
    // Check if current user is admin
    const isAdmin = await group.isAdmin(req.user._id);
    
    // Return group with members included (like Python version)
    const groupData = {
      ...group.toObject(),
      members,
      members_count: members.length,
      members_usernames: members.map(m => m.username),
      isAdmin,
      owner_id: group.ownerId._id
    };
    
    res.status(200).json(groupData);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private (Admin only)
 */
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is admin
    const isAdmin = await group.isAdmin(req.user._id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can update group details'
      });
    }
    
    const allowedFields = ['title', 'description', 'type', 'currency'];
    const updates = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    
    const updatedGroup = await Group.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('ownerId', 'firstName lastName username');
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: group._id,
      action: 'group_updated',
      details: updates,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Group updated successfully',
      data: { group: updatedGroup }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private (Owner only)
 */
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Only owner can delete group
    if (group.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only group owner can delete the group'
      });
    }
    
    // Check if group has expenses
    const Expense = require('../models/Expense');
    const expenseCount = await Expense.countDocuments({ groupId: group._id });
    
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete group with existing expenses. Please settle all expenses first.'
      });
    }
    
    // Remove all memberships
    await Membership.deleteMany({ groupId: group._id });
    
    // Delete group
    await Group.findByIdAndDelete(req.params.id);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'group_deleted',
      details: { 
        groupId: group._id,
        title: group.title 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to group
 * @route   POST /api/groups/:id/members
 * @access  Private (Admin only)
 */
const addMember = async (req, res, next) => {
  try {
    const { userId, isAdmin = false } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
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
    
    // Check if user exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Add member
    await Membership.addMember(group._id, userId, isAdmin);
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: group._id,
      action: 'member_added',
      details: { 
        addedUserId: userId,
        username: userToAdd.username,
        isAdmin
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Member added successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }
    next(error);
  }
};

/**
 * @desc    Remove member from group
 * @route   DELETE /api/groups/:id/members/:userId
 * @access  Private (Admin only)
 */
const removeMember = async (req, res, next) => {
  try {
    const { id: groupId, userId } = req.params;
    
    const group = await Group.findById(groupId);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if current user is admin or removing themselves
    const isAdmin = await group.isAdmin(req.user._id);
    const isSelf = req.user._id.toString() === userId;
    
    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can remove members'
      });
    }
    
    // Cannot remove group owner
    if (group.ownerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove group owner'
      });
    }
    
    // Remove member
    const result = await Membership.removeMember(groupId, userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of this group'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Leave group
 * @route   POST /api/groups/:id/leave
 * @access  Private
 */
const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Cannot leave if user is owner
    if (group.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Group owner cannot leave the group. Transfer ownership or delete the group.'
      });
    }
    
    // Check if user has unsettled expenses
    const Split = require('../models/Split');
    const userBalance = await Split.calculateUserBalance(req.user._id, group._id);
    
    if (Math.abs(userBalance.balance) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave group with unsettled expenses. Please settle all expenses first.',
        data: { balance: userBalance }
      });
    }
    
    // Remove membership
    await Membership.removeMember(group._id, req.user._id);
    
    res.status(200).json({
      success: true,
      message: 'Left group successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get group members
 * @route   GET /api/groups/:id/members
 * @access  Private
 */
const getGroupMembers = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view group members'
      });
    }
    
    // Get members
    const memberships = await Membership.getGroupMembers(group._id);
    
    // Transform to match frontend expectations
    const members = memberships.map(membership => ({
      user_id: membership.userId._id,
      username: membership.userId.username,
      firstName: membership.userId.firstName,
      lastName: membership.userId.lastName,
      email: membership.userId.email,
      profilePhoto: membership.userId.profilePhoto,
      isAdmin: membership.isAdmin,
      updatedAt: membership.updatedAt
    }));
    
    res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if user can leave group
 * @route   GET /api/groups/:id/can_leave
 * @access  Private
 */
const canLeaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group'
      });
    }
    
    // Cannot leave if user is owner
    if (group.ownerId.toString() === req.user._id.toString()) {
      return res.status(200).json({
        can_leave: false,
        reason: 'Group owner cannot leave the group. Transfer ownership or delete the group.'
      });
    }
    
    // Check if user has unsettled expenses
    try {
      const Split = require('../models/Split');
      const userBalance = await Split.calculateUserBalance(req.user._id, group._id);
      
      if (Math.abs(userBalance.balance) > 0.01) {
        return res.status(200).json({
          can_leave: false,
          reason: 'Cannot leave group with unsettled expenses. Please settle all expenses first.',
          balance: userBalance
        });
      }
    } catch (error) {
      // If Split model doesn't exist or balance calculation fails, allow leaving
      console.log('Balance calculation failed:', error.message);
    }
    
    res.status(200).json({
      can_leave: true,
      reason: null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addMember,
  removeMember,
  leaveGroup,
  getGroupMembers,
  canLeaveGroup
};