const User = require('../models/User');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, firstName, lastName, phone, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Get default user role
    let userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      // Create default roles if they don't exist
      await Role.createDefaultRoles();
      userRole = await Role.findOne({ name: 'user' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      passwordHash: password,
      firstName,
      lastName,
      phone,
      gender,
      roleId: userRole._id
    });

    // Log activity
    await ActivityLog.logActivity({
      userId: user._id,
      action: 'user_registered',
      details: { username, email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Generate token
    const token = user.getSignedJwtToken();

    // Remove password from response
    const userResponse = await User.findById(user._id)
      .populate('roleId', 'name permissions')
      .select('-passwordHash');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    console.log('Login request received:', { 
      email: req.body.email, 
      username: req.body.username, 
      hasPassword: !!req.body.password 
    });
    
    const { email, username, password } = req.body;
    const identifier = email || username; // Accept either email or username

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username and password are required'
      });
    }

    // Find user by credentials (email or username)
    const user = await User.findByCredentials(identifier, password);

    // Log activity
    await ActivityLog.logActivity({
      userId: user._id,
      action: 'user_login',
      details: { identifier },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Generate token
    const token = user.getSignedJwtToken();

    // Remove password from response
    const userResponse = await User.findById(user._id)
      .populate('roleId', 'name permissions')
      .select('-passwordHash');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.log('Login error:', error.message);
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('roleId', 'name permissions')
      .select('-passwordHash');

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phone', 'gender', 'globalSettlementMode'];
    const updates = {};

    // Only include allowed fields
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).populate('roleId', 'name permissions').select('-passwordHash');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+passwordHash');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user (client-side token removal)
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
};