const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const User = require('../models/User');
const Membership = require('../models/Membership');
const ActivityLog = require('../models/ActivityLog');
const BalanceService = require('../services/balanceService');
const GlobalSettlement = require('../models/GlobalSettlement');

/**
 * @desc    Get group balances
 * @route   GET /api/settle/:groupId/balances
 * @access  Private
 */
const getGroupBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view balances for this group'
      });
    }
    
    // Get all group members
    const members = await Membership.find({ groupId: groupId })
      .populate('userId', 'username firstName lastName');
    
    if (!members || members.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get user's global settlement mode preference
    const user = await User.findById(req.user._id).select('globalSettlementMode');
    const settlementMode = user?.globalSettlementMode || 'separate';
    
    // Calculate balance for each member
    const balances = await Promise.all(
      members.map(async (member) => {
        const userId = member.userId._id;
        const balanceData = await BalanceService.calculateUserGroupBalance(userId, groupId);
        
        // Get original balance (before global adjustments)
        const originalNet = balanceData.netBalance;
        let netBalance = originalNet;
        let globalAdjustment = 0;
        
        // Apply global settlement adjustments if mode is not 'separate'
        if (settlementMode !== 'separate') {
          // Get global settlements where this user is involved
          const globalSettlements = await GlobalSettlement.find({
            $or: [
              { fromUserId: userId, status: 'accepted' },
              { toUserId: userId, status: 'accepted' }
            ]
          });
          
          // Calculate adjustment from global settlements
          globalSettlements.forEach(gs => {
            const amount = parseFloat(gs.amount.toString());
            if (gs.fromUserId.toString() === userId.toString()) {
              globalAdjustment -= amount; // User paid, so their balance decreases
            } else if (gs.toUserId.toString() === userId.toString()) {
              globalAdjustment += amount; // User received, so their balance increases
            }
          });
          
          // Apply adjustment based on mode
          if (settlementMode === 'auto_adjust') {
            netBalance = originalNet + globalAdjustment;
          } else if (settlementMode === 'hybrid') {
            // Keep original for display, but also show adjustment
            // netBalance stays as originalNet, globalAdjustment is separate
          }
        }
        
        return {
          user_id: userId.toString(),
          username: member.userId.username || 'Unknown',
          firstName: member.userId.firstName || '',
          lastName: member.userId.lastName || '',
          totalPaid: balanceData.totalPaid,
          totalOwed: balanceData.totalOwed,
          receivedSettlements: balanceData.receivedSettlements,
          paidSettlements: balanceData.paidSettlements,
          net: netBalance,
          original_net: originalNet,
          global_adjustment: globalAdjustment,
          isOwed: netBalance > 0.01,
          owes: netBalance < -0.01,
          isSettled: Math.abs(netBalance) <= 0.01
        };
      })
    );
    
    res.status(200).json(balances);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get settlement history for a group
 * @route   GET /api/settle/:groupId/history
 * @access  Private
 */
const getSettlementHistory = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status } = req.query;
    
    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view settlement history for this group'
      });
    }
    
    // Build query for settlements
    let query = {
      groupId: groupId,
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id }
      ]
    };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Get settlements (assuming Settlement model exists)
    const settlements = await Settlement.find(query)
      .populate('fromUserId', 'username firstName lastName')
      .populate('toUserId', 'username firstName lastName')
      .sort({ createdAt: -1 });
    
    // Format response to match frontend expectations (snake_case)
    const formattedSettlements = settlements.map(settlement => ({
      id: settlement._id.toString(),
      group_id: settlement.groupId.toString(),
      from_user_id: settlement.fromUserId._id.toString(),
      from_username: settlement.fromUserId.username || 'Unknown',
      to_user_id: settlement.toUserId._id.toString(),
      to_username: settlement.toUserId.username || 'Unknown',
      amount: parseFloat(settlement.amount.toString()),
      status: settlement.status,
      message: settlement.message || null,
      proof_photo: settlement.proofPhoto || null,
      rejected_reason: settlement.rejectedReason || null,
      created_at: settlement.createdAt,
      updated_at: settlement.updatedAt
    }));
    
    res.status(200).json(formattedSettlements);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get suggested settlements for a group
 * @route   GET /api/settle/:groupId/settlements
 * @access  Private
 */
const getSuggestedSettlements = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    
    // Check if group exists and user is member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = await group.isMember(req.user._id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view settlements for this group'
      });
    }
    
    // Get all group members
    const members = await Membership.find({ groupId: groupId })
      .populate('userId', 'username firstName lastName');
    
    if (!members || members.length === 0) {
      return res.status(200).json([]);
    }
    
    // Calculate balance for each member
    const balances = await Promise.all(
      members.map(async (member) => {
        const userId = member.userId._id;
        const balanceData = await BalanceService.calculateUserGroupBalance(userId, groupId);
        
        return {
          userId: userId,
          user: {
            _id: member.userId._id,
            username: member.userId.username,
            firstName: member.userId.firstName,
            lastName: member.userId.lastName
          },
          balance: balanceData.netBalance
        };
      })
    );
    
    // Use the optimization algorithm to suggest settlements
    const suggestedSettlements = BalanceService.optimizeSettlements(balances);
    
    // Format response to match frontend expectations
    const formattedSettlements = suggestedSettlements.map(settlement => ({
      from_user_id: settlement.fromUserId.toString(),
      from_username: settlement.fromUser?.username || 'Unknown',
      to_user_id: settlement.toUserId.toString(),
      to_username: settlement.toUser?.username || 'Unknown',
      amount: parseFloat(settlement.amount.toString())
    }));
    
    res.status(200).json(formattedSettlements);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a settlement
 * @route   POST /api/settle/:groupId/record
 * @access  Private
 */
const recordSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    // Handle both camelCase and snake_case formats
    const toUserId = req.body.toUserId || req.body.to_user_id;
    const amount = req.body.amount;
    const message = req.body.message;
    
    if (!toUserId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'To user ID and amount are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be positive'
      });
    }
    
    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot settle with yourself'
      });
    }
    
    // Check if group exists and both users are members
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isFromMember = await group.isMember(req.user._id);
    const isToMember = await group.isMember(toUserId);
    
    if (!isFromMember || !isToMember) {
      return res.status(403).json({
        success: false,
        message: 'Both users must be members of the group'
      });
    }
    
    // Create settlement record (assuming Settlement model exists)
    const settlement = await Settlement.create({
      groupId: groupId,
      fromUserId: req.user._id,
      toUserId: toUserId,
      amount: parseFloat(amount),
      status: 'pending',
      message: message || '',
      createdAt: new Date()
    });
    
    // Get user details for response
    const fromUser = await User.findById(req.user._id).select('username');
    const toUser = await User.findById(toUserId).select('username');
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      groupId: groupId,
      action: 'settlement_requested',
      details: {
        toUserId: toUserId,
        toUsername: toUser.username,
        amount: amount
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: {
        settlement: {
          id: settlement._id,
          groupId: settlement.groupId,
          fromUserId: settlement.fromUserId,
          fromUsername: fromUser.username,
          toUserId: settlement.toUserId,
          toUsername: toUser.username,
          amount: settlement.amount,
          status: settlement.status,
          message: settlement.message,
          createdAt: settlement.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept a settlement
 * @route   POST /api/settle/:settlementId/accept
 * @access  Private
 */
const acceptSettlement = async (req, res, next) => {
  try {
    const settlementId = req.params.settlementId;
    
    const settlement = await Settlement.findById(settlementId)
      .populate('fromUserId', 'username')
      .populate('toUserId', 'username');
    
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }
    
    if (settlement.toUserId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can accept this settlement'
      });
    }
    
    if (settlement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Settlement is already ${settlement.status}`
      });
    }
    
    // Update settlement status
    settlement.status = 'accepted';
    settlement.updatedAt = new Date();
    await settlement.save();
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'settlement_accepted',
      details: {
        settlementId: settlement._id,
        fromUsername: settlement.fromUserId.username,
        amount: settlement.amount
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Settlement accepted successfully',
      data: {
        settlement: {
          id: settlement._id,
          groupId: settlement.groupId,
          fromUserId: settlement.fromUserId._id,
          fromUsername: settlement.fromUserId.username,
          toUserId: settlement.toUserId._id,
          toUsername: settlement.toUserId.username,
          amount: settlement.amount,
          status: settlement.status,
          message: settlement.message,
          createdAt: settlement.createdAt,
          updatedAt: settlement.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a settlement
 * @route   POST /api/settle/:settlementId/reject
 * @access  Private
 */
const rejectSettlement = async (req, res, next) => {
  try {
    const settlementId = req.params.settlementId;
    const { reason } = req.body;
    
    const settlement = await Settlement.findById(settlementId)
      .populate('fromUserId', 'username')
      .populate('toUserId', 'username');
    
    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not found'
      });
    }
    
    if (settlement.toUserId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient can reject this settlement'
      });
    }
    
    if (settlement.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Settlement is already ${settlement.status}`
      });
    }
    
    // Update settlement status
    settlement.status = 'rejected';
    settlement.rejectedReason = reason || '';
    settlement.updatedAt = new Date();
    await settlement.save();
    
    // Log activity
    await ActivityLog.logActivity({
      userId: req.user._id,
      action: 'settlement_rejected',
      details: {
        settlementId: settlement._id,
        fromUsername: settlement.fromUserId.username,
        amount: settlement.amount,
        reason: reason
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({
      success: true,
      message: 'Settlement rejected successfully',
      data: {
        settlement: {
          id: settlement._id,
          groupId: settlement.groupId,
          fromUserId: settlement.fromUserId._id,
          fromUsername: settlement.fromUserId.username,
          toUserId: settlement.toUserId._id,
          toUsername: settlement.toUserId.username,
          amount: settlement.amount,
          status: settlement.status,
          message: settlement.message,
          rejectedReason: settlement.rejectedReason,
          createdAt: settlement.createdAt,
          updatedAt: settlement.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get pending settlements for current user
 * @route   GET /api/settle/pending
 * @access  Private
 */
const getPendingSettlements = async (req, res, next) => {
  try {
    const settlements = await Settlement.find({
      toUserId: req.user._id,
      status: 'pending'
    })
    .populate('fromUserId', 'username firstName lastName')
    .populate('groupId', 'title')
    .sort({ createdAt: -1 });
    
    const formattedSettlements = settlements.map(settlement => ({
      id: settlement._id,
      groupId: settlement.groupId._id,
      groupTitle: settlement.groupId.title,
      fromUserId: settlement.fromUserId._id,
      fromUsername: settlement.fromUserId.username,
      toUserId: settlement.toUserId,
      toUsername: req.user.username,
      amount: settlement.amount,
      status: settlement.status,
      message: settlement.message,
      createdAt: settlement.createdAt,
      updatedAt: settlement.updatedAt
    }));
    
    res.status(200).json(formattedSettlements);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGroupBalances,
  getSettlementHistory,
  getSuggestedSettlements,
  recordSettlement,
  acceptSettlement,
  rejectSettlement,
  getPendingSettlements
};