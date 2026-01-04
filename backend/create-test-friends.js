require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');
const Friend = require('./models/Friend');
const connectDB = require('./config/db');

async function createTestFriends() {
  try {
    await connectDB();
    
    console.log('🔄 Creating test friends...');
    
    // Get existing users
    const samir = await User.findOne({ email: 'samir@rls.com' });
    const alice = await User.findOne({ email: 'alice@example.com' });
    const bob = await User.findOne({ email: 'bob@example.com' });
    const charlie = await User.findOne({ email: 'charlie@example.com' });
    
    if (!samir || !alice || !bob || !charlie) {
      console.log('❌ Some users not found. Make sure to run the seed script first.');
      return;
    }
    
    console.log('✅ Found users:', {
      samir: samir.username,
      alice: alice.username,
      bob: bob.username,
      charlie: charlie.username
    });
    
    // Clear existing friendships
    await Friend.deleteMany({});
    console.log('🧹 Cleared existing friendships');
    
    // Create some friendships
    const friendships = [
      // Samir and Alice are friends
      {
        userId: samir._id,
        friendId: alice._id,
        requestedBy: samir._id,
        status: 'accepted',
        respondedAt: new Date()
      },
      // Samir and Bob are friends
      {
        userId: samir._id,
        friendId: bob._id,
        requestedBy: bob._id,
        status: 'accepted',
        respondedAt: new Date()
      },
      // Charlie sent a friend request to Samir (pending)
      {
        userId: charlie._id,
        friendId: samir._id,
        requestedBy: charlie._id,
        status: 'pending'
      },
      // Alice and Bob are friends
      {
        userId: alice._id,
        friendId: bob._id,
        requestedBy: alice._id,
        status: 'accepted',
        respondedAt: new Date()
      }
    ];
    
    await Friend.insertMany(friendships);
    console.log('✅ Created test friendships');
    
    console.log('📊 Summary:');
    console.log('- Samir has 2 friends (Alice, Bob) and 1 pending request from Charlie');
    console.log('- Alice has 2 friends (Samir, Bob)');
    console.log('- Bob has 2 friends (Samir, Alice)');
    console.log('- Charlie has 1 pending request to Samir');
    
  } catch (error) {
    console.error('❌ Error creating test friends:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

createTestFriends();