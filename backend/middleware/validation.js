const Joi = require('joi');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    // Clean empty strings and null values from body for userUpdate schema
    if (property === 'body' && req.body && typeof req.body === 'object') {
      const userUpdateFields = ['firstName', 'lastName', 'phone', 'gender', 'globalSettlementMode'];
      const hasUserUpdateFields = userUpdateFields.some(field => field in req.body);
      
      if (hasUserUpdateFields) {
        const cleaned = {};
        Object.keys(req.body).forEach(key => {
          const value = req.body[key];
          // Only include non-empty, non-null, non-undefined values
          if (value !== null && value !== undefined && value !== '') {
            cleaned[key] = value;
          }
        });
        req.body = cleaned;
      }
    }

    console.log(`Validating ${property}:`, req[property]);

    const { error } = schema.validate(req[property], { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.log('Validation failed:', errors);

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    console.log('Validation passed');
    next();
  };
};

// Common validation schemas
const schemas = {
  // User schemas
  userRegister: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    gender: Joi.string().valid('Male', 'Female').optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().optional(),
    username: Joi.string().optional(),
    password: Joi.string().required()
  }).or('email', 'username'), // At least one of email or username is required

  userUpdate: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    gender: Joi.string().valid('Male', 'Female').optional(),
    globalSettlementMode: Joi.string().valid('separate', 'auto_adjust', 'hybrid').optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }),

  // Group schemas
  groupCreate: Joi.object({
    title: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    type: Joi.string().max(50).optional(),
    currency: Joi.string().length(3).default('USD').optional(),
    member_ids: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    ).optional().default([])
  }),

  groupUpdate: Joi.object({
    title: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).allow(null, '').optional(),
    photo: Joi.string().allow(null, '').optional(),
    type: Joi.string().max(50).optional(),
    currency: Joi.string().length(3).optional()
  }),

  // Expense schemas
  expenseCreate: Joi.object({
    groupId: Joi.string().hex().length(24).optional(),
    group_id: Joi.string().hex().length(24).optional(), // Accept ObjectId string
    description: Joi.string().min(1).max(200).required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).default('USD').optional(),
    category: Joi.string().max(50).optional(),
    payerId: Joi.string().hex().length(24).optional(),
    payer_id: Joi.string().hex().length(24).optional(), // Accept ObjectId string
    walletId: Joi.string().hex().length(24).optional(),
    wallet_id: Joi.string().hex().length(24).allow(null).optional(), // Accept ObjectId string or null
    splitType: Joi.string().valid('equal', 'exact', 'percentage').default('equal').optional(),
    note: Joi.string().max(500).allow(null, '').optional(),
    created_at: Joi.date().optional(), // Allow created_at from frontend
    splits: Joi.array().items(
      Joi.object({
        userId: Joi.string().hex().length(24).optional(),
        user_id: Joi.string().hex().length(24).optional(), // Accept ObjectId string
        shareAmount: Joi.number().positive().precision(2).optional(),
        share_amount: Joi.number().positive().precision(2).optional() // Accept both formats
      }).or('userId', 'user_id').or('shareAmount', 'share_amount')
    ).optional()
  }).or('groupId', 'group_id').or('payerId', 'payer_id'),

  expenseUpdate: Joi.object({
    description: Joi.string().min(1).max(200).optional(),
    amount: Joi.number().positive().precision(2).optional(),
    currency: Joi.string().length(3).optional(),
    category: Joi.string().max(50).optional(),
    walletId: Joi.string().hex().length(24).allow(null).optional(),
    wallet_id: Joi.string().hex().length(24).allow(null).optional(),
    created_at: Joi.date().optional(),
    splitType: Joi.string().valid('equal', 'exact', 'percentage').optional(),
    note: Joi.string().max(500).allow(null, '').optional(),
    splits: Joi.array().items(
      Joi.object({
        userId: Joi.string().hex().length(24).optional(),
        user_id: Joi.string().hex().length(24).optional(), // Accept ObjectId string
        shareAmount: Joi.number().positive().precision(2).optional(),
        share_amount: Joi.number().positive().precision(2).optional() // Accept both formats
      }).or('userId', 'user_id').or('shareAmount', 'share_amount')
    ).optional()
  }),

  // Wallet schemas
  walletCreate: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    category: Joi.string().valid('cash', 'bank', 'credit_card', 'other', 'Cash', 'Bank', 'Credit Card', 'Other').required(),
    balance: Joi.number().precision(2).default(0).optional()
  }),

  walletUpdate: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    category: Joi.string().valid('cash', 'bank', 'credit_card', 'other', 'Cash', 'Bank', 'Credit Card', 'Other').optional(),
    balance: Joi.number().precision(2).optional()
  }),

  walletTransfer: Joi.object({
    fromWalletId: Joi.string().hex().length(24).required(),
    toWalletId: Joi.string().hex().length(24).required(),
    amount: Joi.number().positive().precision(2).required(),
    description: Joi.string().max(200).optional()
  }),

  // Settlement schemas
  settlementRecord: Joi.object({
    fromUserId: Joi.string().hex().length(24).required(),
    toUserId: Joi.string().hex().length(24).required(),
    amount: Joi.number().positive().precision(2).required(),
    message: Joi.string().max(200).optional()
  }),

  settlementResponse: Joi.object({
    status: Joi.string().valid('accepted', 'rejected').required(),
    rejectedReason: Joi.string().max(200).optional()
  }),

  // Query parameter schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    _t: Joi.number().optional(), // Allow cache-busting timestamp
    category: Joi.string().optional(),
    payerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional()
  }),

  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),

  // Group ID validation (for :groupId params)
  groupIdParam: Joi.object({
    groupId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // ID validation (for :id params)
  idParam: Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // Settlement ID validation (for :settlementId params)
  settlementIdParam: Joi.object({
    settlementId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // User ID validation (for :userId params)
  userIdParam: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  }),

  // Friend ID validation (for :friendId params)
  friendIdParam: Joi.object({
    friendId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })
};

module.exports = {
  validate,
  schemas
};