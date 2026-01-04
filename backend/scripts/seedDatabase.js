require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Group = require('../models/Group');
const Membership = require('../models/Membership');
const Expense = require('../models/Expense');
const Split = require('../models/Split');
const Wallet = require('../models/Wallet');

const connectDB = require('../config/db');

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Group.deleteMany({}),
      Membership.deleteMany({}),
      Expense.deleteMany({}),
      Split.deleteMany({}),
      Wallet.deleteMany({})
    ]);
    
    console.log('🧹 Cleared existing data');
    
    // Create roles
    const adminRole = await Role.create({
      name: 'admin',
      permissions: ['admin', 'user:read', 'user:write', 'user:delete', 'group:read', 'group:write', 'group:delete', 'expense:read', 'expense:write', 'expense:delete']
    });
    
    const userRole = await Role.create({
      name: 'user',
      permissions: ['user:read', 'group:read', 'group:write', 'expense:read', 'expense:write']
    });
    
    console.log('👥 Created roles');
    
    // Create users
    const users = await User.create([
      {
        username: 'admin',
        email: 'admin@spliteasy.com',
        passwordHash: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        gender: 'Male',
        roleId: adminRole._id,
        globalSettlementMode: 'auto_adjust'
      },
      {
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: 'password123',
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '+1234567891',
        gender: 'Female',
        roleId: userRole._id,
        globalSettlementMode: 'separate'
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: 'password123',
        firstName: 'Bob',
        lastName: 'Smith',
        phone: '+1234567892',
        gender: 'Male',
        roleId: userRole._id,
        globalSettlementMode: 'hybrid'
      },
      {
        username: 'charlie',
        email: 'charlie@example.com',
        passwordHash: 'password123',
        firstName: 'Charlie',
        lastName: 'Brown',
        phone: '+1234567893',
        gender: 'Male',
        roleId: userRole._id,
        globalSettlementMode: 'separate'
      },
      {
        username: 'diana',
        email: 'diana@example.com',
        passwordHash: 'password123',
        firstName: 'Diana',
        lastName: 'Wilson',
        phone: '+1234567894',
        gender: 'Female',
        roleId: userRole._id,
        globalSettlementMode: 'auto_adjust'
      }
    ]);
    
    console.log('👤 Created users');
    
    // Create wallets for users
    const wallets = [];
    for (const user of users) {
      const userWallets = await Wallet.create([
        {
          userId: user._id,
          name: 'Main Checking',
          category: 'bank',
          balance: Math.floor(Math.random() * 2000) + 500
        },
        {
          userId: user._id,
          name: 'Cash Wallet',
          category: 'cash',
          balance: Math.floor(Math.random() * 500) + 50
        }
      ]);
      wallets.push(...userWallets);
    }
    
    console.log('💳 Created wallets');
    
    // Create groups
    const groups = await Group.create([
      {
        title: 'Weekend Trip',
        description: 'Our amazing weekend getaway',
        ownerId: users[1]._id, // Alice
        type: 'Travel',
        currency: 'USD'
      },
      {
        title: 'Office Lunch Group',
        description: 'Daily lunch expenses for the team',
        ownerId: users[2]._id, // Bob
        type: 'Food',
        currency: 'USD'
      },
      {
        title: 'Apartment Expenses',
        description: 'Shared apartment costs',
        ownerId: users[3]._id, // Charlie
        type: 'Housing',
        currency: 'USD'
      }
    ]);
    
    console.log('🏠 Created groups');
    
    // Create memberships
    const memberships = [
      // Weekend Trip - Alice (owner), Bob, Charlie
      { userId: users[1]._id, groupId: groups[0]._id, isAdmin: true },
      { userId: users[2]._id, groupId: groups[0]._id, isAdmin: false },
      { userId: users[3]._id, groupId: groups[0]._id, isAdmin: false },
      
      // Office Lunch - Bob (owner), Alice, Diana
      { userId: users[2]._id, groupId: groups[1]._id, isAdmin: true },
      { userId: users[1]._id, groupId: groups[1]._id, isAdmin: false },
      { userId: users[4]._id, groupId: groups[1]._id, isAdmin: false },
      
      // Apartment - Charlie (owner), Alice, Bob, Diana
      { userId: users[3]._id, groupId: groups[2]._id, isAdmin: true },
      { userId: users[1]._id, groupId: groups[2]._id, isAdmin: false },
      { userId: users[2]._id, groupId: groups[2]._id, isAdmin: false },
      { userId: users[4]._id, groupId: groups[2]._id, isAdmin: false }
    ];
    
    await Membership.insertMany(memberships);
    console.log('👥 Created memberships');
    
    // Create expenses with splits
    const expenseData = [
      // Weekend Trip expenses
      {
        groupId: groups[0]._id,
        payerId: users[1]._id, // Alice
        description: 'Hotel booking',
        amount: 300.00,
        category: 'Accommodation',
        memberIds: [users[1]._id, users[2]._id, users[3]._id]
      },
      {
        groupId: groups[0]._id,
        payerId: users[2]._id, // Bob
        description: 'Gas for the trip',
        amount: 80.00,
        category: 'Transportation',
        memberIds: [users[1]._id, users[2]._id, users[3]._id]
      },
      {
        groupId: groups[0]._id,
        payerId: users[3]._id, // Charlie
        description: 'Dinner at restaurant',
        amount: 150.00,
        category: 'Food',
        memberIds: [users[1]._id, users[2]._id, users[3]._id]
      },
      
      // Office Lunch expenses
      {
        groupId: groups[1]._id,
        payerId: users[2]._id, // Bob
        description: 'Pizza lunch',
        amount: 45.00,
        category: 'Food',
        memberIds: [users[1]._id, users[2]._id, users[4]._id]
      },
      {
        groupId: groups[1]._id,
        payerId: users[1]._id, // Alice
        description: 'Coffee and pastries',
        amount: 25.00,
        category: 'Food',
        memberIds: [users[1]._id, users[2]._id, users[4]._id]
      },
      
      // Apartment expenses
      {
        groupId: groups[2]._id,
        payerId: users[3]._id, // Charlie
        description: 'Monthly rent',
        amount: 2000.00,
        category: 'Rent',
        memberIds: [users[1]._id, users[2]._id, users[3]._id, users[4]._id]
      },
      {
        groupId: groups[2]._id,
        payerId: users[1]._id, // Alice
        description: 'Electricity bill',
        amount: 120.00,
        category: 'Utilities',
        memberIds: [users[1]._id, users[2]._id, users[3]._id, users[4]._id]
      },
      {
        groupId: groups[2]._id,
        payerId: users[4]._id, // Diana
        description: 'Groceries',
        amount: 180.00,
        category: 'Food',
        memberIds: [users[1]._id, users[2]._id, users[3]._id, users[4]._id]
      }
    ];
    
    for (const expenseInfo of expenseData) {
      const { memberIds, ...expenseFields } = expenseInfo;
      
      // Create expense
      const expense = await Expense.create({
        ...expenseFields,
        addedBy: expenseFields.payerId,
        walletId: wallets.find(w => w.userId.toString() === expenseFields.payerId.toString())?._id
      });
      
      // Create equal splits
      const splitAmount = parseFloat(expense.amount.toString()) / memberIds.length;
      const splits = memberIds.map(memberId => ({
        expenseId: expense._id,
        userId: memberId,
        shareAmount: splitAmount
      }));
      
      await Split.insertMany(splits);
    }
    
    console.log('💰 Created expenses and splits');
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Groups: ${groups.length}`);
    console.log(`- Expenses: ${expenseData.length}`);
    console.log(`- Wallets: ${wallets.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@spliteasy.com / admin123');
    console.log('Alice: alice@example.com / password123');
    console.log('Bob: bob@example.com / password123');
    console.log('Charlie: charlie@example.com / password123');
    console.log('Diana: diana@example.com / password123');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;