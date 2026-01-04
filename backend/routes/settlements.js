const express = require('express');
const Settlement = require('../models/Settlement');
const GlobalSettlement = require('../models/GlobalSettlement');
const Split = require('../models/Split');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get group balances
// @route   GET /api/settle/:groupId/balances
// @access  Private
router.get('/:groupId/balances',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
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
      
      // Get balances
      const balances = await Split.getGroupBalances(groupId);
      
      res.status(200).json({
        success: true,
        data: { balances }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get suggested settlements for group
// @route   GET /api/settle/:groupId/settlements
// @access  Private
router.get('/:groupId/settlements',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
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
      
      // Get suggested settlements
      const suggestedSettlements = await Settlement.getSuggestedSettlements(groupId);
      
      // Get existing settlements
      const { page = 1, limit = 20, status } = req.query;
      const existingSettlements = await Settlement.getGroupSettlements(groupId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      res.status(200).json({
        success: true,
        data: {
          suggested: suggestedSettlements,
          existing: existingSettlements
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Record settlement
// @route   POST /api/settle/:groupId/record
// @access  Private
router.post('/:groupId/record',
  validate(schemas.objectId, 'params'),
  validate(schemas.settlementRecord),
  async (req, res, next) => {
    try {
      const { groupId } = req.params;
      const { fromUserId, toUserId, amount, message } = req.body;
      
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
          message: 'Not authorized to record settlements for this group'
        });
      }
      
      // Validate that current user is either fromUser or toUser
      if (req.user._id.toString() !== fromUserId && req.user._id.toString() !== toUserId) {
        return res.status(403).json({
          success: false,
          message: 'You can only record settlements involving yourself'
        });
      }
      
      // Check if both users are group members
      const fromIsMember = await group.isMember(fromUserId);
      const toIsMember = await group.isMember(toUserId);
      
      if (!fromIsMember || !toIsMember) {
        return res.status(400).json({
          success: false,
          message: 'Both users must be members of the group'
        });
      }
      
      // Create settlement
      const settlement = await Settlement.create({
        groupId,
        fromUserId,
        toUserId,
        amount,
        message
      });
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'request');
      
      // Log activity
      await ActivityLog.logActivity({
        userId: req.user._id,
        groupId,
        action: 'settlement_created',
        details: {
          settlementId: settlement._id,
          fromUserId,
          toUserId,
          amount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Get populated settlement
      const populatedSettlement = await Settlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(201).json({
        success: true,
        message: 'Settlement recorded successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Accept settlement
// @route   POST /api/settle/:id/accept
// @access  Private
router.post('/:id/accept',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const settlement = await Settlement.findById(req.params.id);
      
      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Settlement not found'
        });
      }
      
      // Accept settlement
      await settlement.accept(req.user._id);
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'accepted');
      
      // Get populated settlement
      const populatedSettlement = await Settlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(200).json({
        success: true,
        message: 'Settlement accepted successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      if (error.message.includes('Only the recipient') || error.message.includes('not in pending')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

// @desc    Reject settlement
// @route   POST /api/settle/:id/reject
// @access  Private
router.post('/:id/reject',
  validate(schemas.objectId, 'params'),
  validate(schemas.settlementResponse),
  async (req, res, next) => {
    try {
      const { rejectedReason } = req.body;
      
      const settlement = await Settlement.findById(req.params.id);
      
      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Settlement not found'
        });
      }
      
      // Reject settlement
      await settlement.reject(req.user._id, rejectedReason);
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'rejected');
      
      // Get populated settlement
      const populatedSettlement = await Settlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(200).json({
        success: true,
        message: 'Settlement rejected successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      if (error.message.includes('Only the recipient') || error.message.includes('not in pending')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

// @desc    Get global balances
// @route   GET /api/settle/global/balances
// @access  Private
router.get('/global/balances', async (req, res, next) => {
  try {
    // Get global balances for current user
    const balances = await GlobalSettlement.calculateGlobalBalances(req.user._id);
    
    // Get suggested settlements
    const suggestedSettlements = await GlobalSettlement.getSuggestedGlobalSettlements(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        balances,
        suggested: suggestedSettlements
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Record global settlement
// @route   POST /api/settle/global/record
// @access  Private
router.post('/global/record',
  validate(schemas.settlementRecord),
  async (req, res, next) => {
    try {
      const { fromUserId, toUserId, amount, message } = req.body;
      
      // Validate that current user is either fromUser or toUser
      if (req.user._id.toString() !== fromUserId && req.user._id.toString() !== toUserId) {
        return res.status(403).json({
          success: false,
          message: 'You can only record settlements involving yourself'
        });
      }
      
      // Create global settlement
      const settlement = await GlobalSettlement.create({
        fromUserId,
        toUserId,
        amount,
        message
      });
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'request');
      
      // Log activity
      await ActivityLog.logActivity({
        userId: req.user._id,
        action: 'global_settlement_created',
        details: {
          settlementId: settlement._id,
          fromUserId,
          toUserId,
          amount
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Get populated settlement
      const populatedSettlement = await GlobalSettlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(201).json({
        success: true,
        message: 'Global settlement recorded successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Accept global settlement
// @route   POST /api/settle/global/:id/accept
// @access  Private
router.post('/global/:id/accept',
  validate(schemas.objectId, 'params'),
  async (req, res, next) => {
    try {
      const settlement = await GlobalSettlement.findById(req.params.id);
      
      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Global settlement not found'
        });
      }
      
      // Accept settlement
      await settlement.accept(req.user._id);
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'accepted');
      
      // Get populated settlement
      const populatedSettlement = await GlobalSettlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(200).json({
        success: true,
        message: 'Global settlement accepted successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      if (error.message.includes('Only the recipient') || error.message.includes('not in pending')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

// @desc    Reject global settlement
// @route   POST /api/settle/global/:id/reject
// @access  Private
router.post('/global/:id/reject',
  validate(schemas.objectId, 'params'),
  validate(schemas.settlementResponse),
  async (req, res, next) => {
    try {
      const { rejectedReason } = req.body;
      
      const settlement = await GlobalSettlement.findById(req.params.id);
      
      if (!settlement) {
        return res.status(404).json({
          success: false,
          message: 'Global settlement not found'
        });
      }
      
      // Reject settlement
      await settlement.reject(req.user._id, rejectedReason);
      
      // Create notification
      await Notification.createSettlementNotification(settlement, 'rejected');
      
      // Get populated settlement
      const populatedSettlement = await GlobalSettlement.findById(settlement._id)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username');
      
      res.status(200).json({
        success: true,
        message: 'Global settlement rejected successfully',
        data: { settlement: populatedSettlement }
      });
    } catch (error) {
      if (error.message.includes('Only the recipient') || error.message.includes('not in pending')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
);

// @desc    Get user settlements (both group and global)
// @route   GET /api/settle/my-settlements
// @access  Private
router.get('/my-settlements', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    
    const query = {
      $or: [
        { fromUserId: req.user._id },
        { toUserId: req.user._id }
      ]
    };
    
    if (status) query.status = status;
    
    let settlements = [];
    
    if (!type || type === 'group') {
      const groupSettlements = await Settlement.find(query)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username')
        .populate('groupId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      settlements = settlements.concat(groupSettlements.map(s => ({
        ...s.toObject(),
        type: 'group'
      })));
    }
    
    if (!type || type === 'global') {
      const globalSettlements = await GlobalSettlement.find(query)
        .populate('fromUserId', 'firstName lastName username')
        .populate('toUserId', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      settlements = settlements.concat(globalSettlements.map(s => ({
        ...s.toObject(),
        type: 'global'
      })));
    }
    
    // Sort by creation date
    settlements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({
      success: true,
      data: { settlements }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;