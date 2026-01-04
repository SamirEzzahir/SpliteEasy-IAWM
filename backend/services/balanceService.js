const Split = require('../models/Split');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const GlobalSettlement = require('../models/GlobalSettlement');

class BalanceService {
  /**
   * Calculate detailed balance for a user in a specific group
   */
  static async calculateUserGroupBalance(userId, groupId) {
    try {
      // Get all expenses paid by user in the group
      const paidExpenses = await Expense.find({ 
        groupId, 
        payerId: userId 
      }).select('amount currency');
      
      const totalPaid = paidExpenses.reduce((sum, expense) => {
        return sum + parseFloat(expense.amount.toString());
      }, 0);
      
      // Get all splits for user in the group
      const userSplits = await Split.find({ userId })
        .populate({
          path: 'expenseId',
          match: { groupId },
          select: 'amount currency'
        });
      
      const totalOwed = userSplits.reduce((sum, split) => {
        if (split.expenseId) {
          return sum + parseFloat(split.shareAmount.toString());
        }
        return sum;
      }, 0);
      
      // Get settled amounts
      const settledAsReceiver = await Settlement.aggregate([
        {
          $match: {
            groupId: groupId,
            toUserId: userId,
            status: 'accepted'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: '$amount' } }
          }
        }
      ]);
      
      const settledAsPayer = await Settlement.aggregate([
        {
          $match: {
            groupId: groupId,
            fromUserId: userId,
            status: 'accepted'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: '$amount' } }
          }
        }
      ]);
      
      const receivedSettlements = settledAsReceiver[0]?.total || 0;
      const paidSettlements = settledAsPayer[0]?.total || 0;
      
      const netBalance = totalPaid - totalOwed + receivedSettlements - paidSettlements;
      
      return {
        totalPaid,
        totalOwed,
        receivedSettlements,
        paidSettlements,
        netBalance, // Positive means user is owed money, negative means user owes money
        isOwed: netBalance > 0.01,
        owes: netBalance < -0.01,
        isSettled: Math.abs(netBalance) <= 0.01
      };
    } catch (error) {
      throw new Error(`Error calculating user group balance: ${error.message}`);
    }
  }
  
  /**
   * Calculate global balance between two users across all groups
   */
  static async calculateGlobalUserBalance(userId1, userId2) {
    try {
      const Membership = require('../models/Membership');
      
      // Find common groups
      const user1Groups = await Membership.find({ userId: userId1 }).select('groupId');
      const user2Groups = await Membership.find({ userId: userId2 }).select('groupId');
      
      const user1GroupIds = user1Groups.map(g => g.groupId.toString());
      const user2GroupIds = user2Groups.map(g => g.groupId.toString());
      
      const commonGroupIds = user1GroupIds.filter(id => user2GroupIds.includes(id));
      
      let totalBalance = 0;
      const groupBalances = [];
      
      // Calculate balance for each common group
      for (const groupId of commonGroupIds) {
        const user1Balance = await this.calculateUserGroupBalance(userId1, groupId);
        const user2Balance = await this.calculateUserGroupBalance(userId2, groupId);
        
        // Net balance between the two users in this group
        const groupNetBalance = user1Balance.netBalance - user2Balance.netBalance;
        
        groupBalances.push({
          groupId,
          user1Balance: user1Balance.netBalance,
          user2Balance: user2Balance.netBalance,
          netBalance: groupNetBalance
        });
        
        totalBalance += groupNetBalance;
      }
      
      // Get global settlements between these users
      const globalSettlements = await GlobalSettlement.find({
        $or: [
          { fromUserId: userId1, toUserId: userId2, status: 'accepted' },
          { fromUserId: userId2, toUserId: userId1, status: 'accepted' }
        ]
      });
      
      let settledAmount = 0;
      globalSettlements.forEach(settlement => {
        const amount = parseFloat(settlement.amount.toString());
        if (settlement.fromUserId.toString() === userId1.toString()) {
          settledAmount -= amount; // User1 paid User2
        } else {
          settledAmount += amount; // User2 paid User1
        }
      });
      
      const finalBalance = totalBalance + settledAmount;
      
      return {
        totalBalance,
        settledAmount,
        finalBalance, // Positive means userId1 is owed by userId2
        groupBalances,
        isOwed: finalBalance > 0.01,
        owes: finalBalance < -0.01,
        isSettled: Math.abs(finalBalance) <= 0.01
      };
    } catch (error) {
      throw new Error(`Error calculating global user balance: ${error.message}`);
    }
  }
  
  /**
   * Optimize settlements using cash flow minimization algorithm
   */
  static optimizeSettlements(balances) {
    try {
      // Separate creditors and debtors
      const creditors = balances
        .filter(b => b.balance > 0.01)
        .sort((a, b) => b.balance - a.balance);
      
      const debtors = balances
        .filter(b => b.balance < -0.01)
        .sort((a, b) => a.balance - b.balance);
      
      const settlements = [];
      let i = 0, j = 0;
      
      while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        
        const settleAmount = Math.min(creditor.balance, Math.abs(debtor.balance));
        
        if (settleAmount > 0.01) {
          settlements.push({
            fromUserId: debtor.userId,
            toUserId: creditor.userId,
            amount: Math.round(settleAmount * 100) / 100,
            fromUser: debtor.user,
            toUser: creditor.user
          });
          
          creditor.balance -= settleAmount;
          debtor.balance += settleAmount;
        }
        
        if (Math.abs(creditor.balance) < 0.01) i++;
        if (Math.abs(debtor.balance) < 0.01) j++;
      }
      
      return settlements;
    } catch (error) {
      throw new Error(`Error optimizing settlements: ${error.message}`);
    }
  }
  
  /**
   * Calculate settlement efficiency metrics
   */
  static calculateSettlementMetrics(balances, settlements) {
    try {
      const totalDebt = balances
        .filter(b => b.balance < 0)
        .reduce((sum, b) => sum + Math.abs(b.balance), 0);
      
      const totalCredit = balances
        .filter(b => b.balance > 0)
        .reduce((sum, b) => sum + b.balance, 0);
      
      const settledAmount = settlements
        .reduce((sum, s) => sum + s.amount, 0);
      
      const efficiency = totalDebt > 0 ? (settledAmount / totalDebt) * 100 : 100;
      
      return {
        totalDebt: Math.round(totalDebt * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        settledAmount: Math.round(settledAmount * 100) / 100,
        numberOfSettlements: settlements.length,
        efficiency: Math.round(efficiency * 100) / 100
      };
    } catch (error) {
      throw new Error(`Error calculating settlement metrics: ${error.message}`);
    }
  }
}

module.exports = BalanceService;