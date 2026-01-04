const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

// Debug middleware for login
const debugLogin = (req, res, next) => {
  console.log('=== LOGIN REQUEST DEBUG ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('========================');
  next();
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', validate(schemas.userRegister), authController.register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', 
  debugLogin,
  validate(schemas.userLogin), 
  authController.login
);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, authController.getMe);

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
router.put('/me', 
  protect, 
  validate(schemas.userUpdate), 
  authController.updateProfile
);

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
router.post('/change-password', 
  protect, 
  validate(schemas.changePassword), 
  authController.changePassword
);

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, authController.logout);

module.exports = router;