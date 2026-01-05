const express = require('express');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const {
  getUserWallets,
  createWallet,
  getWalletById,
  updateWallet,
  deleteWallet
} = require('../controllers/walletController');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user wallets
// @route   GET /api/wallets
// @access  Private
router.get('/', getUserWallets);

// @desc    Create wallet
// @route   POST /api/wallets
// @access  Private
router.post('/', validate(schemas.walletCreate), createWallet);

// @desc    Get wallet by ID
// @route   GET /api/wallets/:id
// @access  Private
router.get('/:id', validate(schemas.objectId, 'params'), getWalletById);

// @desc    Update wallet
// @route   PUT /api/wallets/:id
// @access  Private
router.put('/:id',
  validate(schemas.objectId, 'params'),
  validate(schemas.walletUpdate),
  updateWallet
);

// @desc    Delete wallet
// @route   DELETE /api/wallets/:id
// @access  Private
router.delete('/:id', validate(schemas.objectId, 'params'), deleteWallet);

module.exports = router;