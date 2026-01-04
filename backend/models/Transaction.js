const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  fromWalletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'From wallet ID is required']
  },
  toWalletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'To wallet ID is required']
  },
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: ['transfer', 'expense', 'income', 'adjustment'],
    default: 'transfer'
  }
}, {
  timestamps: true,
  toJSON: { transform: transformDecimal },
  toObject: { transform: transformDecimal }
});

// Transform function to convert Decimal128 to number
function transformDecimal(doc, ret) {
  if (ret.amount) {
    ret.amount = parseFloat(ret.amount.toString());
  }
  return ret;
}

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ fromWalletId: 1 });
transactionSchema.index({ toWalletId: 1 });
transactionSchema.index({ type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);