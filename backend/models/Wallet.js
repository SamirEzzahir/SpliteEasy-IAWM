const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Wallet name is required'],
    trim: true,
    maxlength: [50, 'Wallet name cannot exceed 50 characters']
  },
  category: {
    type: String,
    required: [true, 'Wallet category is required'],
    enum: ['cash', 'bank', 'credit_card', 'other']
  },
  balance: {
    type: mongoose.Schema.Types.Decimal128,
    default: 0,
    min: [0, 'Balance cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { transform: transformDecimal },
  toObject: { transform: transformDecimal }
});

// Transform function to convert Decimal128 to number
function transformDecimal(doc, ret) {
  if (ret.balance) {
    ret.balance = parseFloat(ret.balance.toString());
  }
  return ret;
}

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ category: 1 });
walletSchema.index({ userId: 1, name: 1 }, { unique: true });

// Instance method to update balance
walletSchema.methods.updateBalance = async function(amount, operation = 'add') {
  const currentBalance = parseFloat(this.balance.toString());
  let newBalance;
  
  if (operation === 'add') {
    newBalance = currentBalance + amount;
  } else if (operation === 'subtract') {
    newBalance = currentBalance - amount;
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }
  } else {
    throw new Error('Invalid operation. Use "add" or "subtract"');
  }
  
  this.balance = newBalance;
  return await this.save();
};

// Static method to transfer between wallets
walletSchema.statics.transfer = async function(fromWalletId, toWalletId, amount, description = '') {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const fromWallet = await this.findById(fromWalletId).session(session);
      const toWallet = await this.findById(toWalletId).session(session);
      
      if (!fromWallet || !toWallet) {
        throw new Error('Wallet not found');
      }
      
      if (fromWallet.userId.toString() !== toWallet.userId.toString()) {
        throw new Error('Cannot transfer between wallets of different users');
      }
      
      const fromBalance = parseFloat(fromWallet.balance.toString());
      if (fromBalance < amount) {
        throw new Error('Insufficient balance in source wallet');
      }
      
      // Update balances
      fromWallet.balance = fromBalance - amount;
      toWallet.balance = parseFloat(toWallet.balance.toString()) + amount;
      
      await fromWallet.save({ session });
      await toWallet.save({ session });
      
      // Create transaction record
      const Transaction = mongoose.model('Transaction');
      await Transaction.create([{
        userId: fromWallet.userId,
        fromWalletId,
        toWalletId,
        amount,
        description,
        type: 'transfer'
      }], { session });
    });
    
    return { success: true, message: 'Transfer completed successfully' };
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

// Static method to get user's total balance
walletSchema.statics.getUserTotalBalance = async function(userId) {
  const wallets = await this.find({ userId });
  return wallets.reduce((total, wallet) => {
    return total + parseFloat(wallet.balance.toString());
  }, 0);
};

module.exports = mongoose.model('Wallet', walletSchema);