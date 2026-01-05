const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const settlementController = require('../controllers/settlementController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get pending settlements for current user
// @route   GET /api/settle/pending
// @access  Private
router.get('/pending', settlementController.getPendingSettlements);

// @desc    Get group balances
// @route   GET /api/settle/:groupId/balances
// @access  Private
router.get('/:groupId/balances', 
  validate(schemas.groupIdParam, 'params'), 
  settlementController.getGroupBalances
);

// @desc    Get settlement history for a group
// @route   GET /api/settle/:groupId/history
// @access  Private
router.get('/:groupId/history', 
  validate(schemas.groupIdParam, 'params'), 
  settlementController.getSettlementHistory
);

// @desc    Get suggested settlements for a group
// @route   GET /api/settle/:groupId/settlements
// @access  Private
router.get('/:groupId/settlements', 
  validate(schemas.groupIdParam, 'params'), 
  settlementController.getSuggestedSettlements
);

// @desc    Record a settlement
// @route   POST /api/settle/:groupId/record
// @access  Private
router.post('/:groupId/record', 
  validate(schemas.groupIdParam, 'params'), 
  settlementController.recordSettlement
);

// @desc    Accept a settlement
// @route   POST /api/settle/:settlementId/accept
// @access  Private
router.post('/:settlementId/accept', 
  validate(schemas.objectId, 'params'), 
  settlementController.acceptSettlement
);

// @desc    Reject a settlement
// @route   POST /api/settle/:settlementId/reject
// @access  Private
router.post('/:settlementId/reject', 
  validate(schemas.objectId, 'params'), 
  settlementController.rejectSettlement
);

module.exports = router;