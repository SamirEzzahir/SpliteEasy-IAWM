require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');

async function checkDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
    
    // Check if roles exist
    const roleCount = await Role.countDocuments();
    console.log(`📋 Roles in database: ${roleCount}`);
    
    if (roleCount === 0) {
      console.log('⚠️ No roles found. Creating default roles...');
      await Role.createDefaultRoles();
      console.log('✅ Default roles created');
    }
    
    // Check if users exist
    const userCount = await User.countDocuments();
    console.log(`👥 Users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️ No users found. Creating a test user...');
      
      // Get user role
      const userRole = await Role.findOne({ name: 'user' });
      
      // Create test user
      const testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'password123',
        firstName: 'Test',
        lastName: 'User',
        roleId: userRole._id
      });
      
      console.log('✅ Test user created:');
      console.log('   Email: test@example.com');
      console.log('   Password: password123');
    } else {
      // List existing users
      const users = await User.find().select('email firstName lastName');
      console.log('📋 Existing users:');
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

checkDatabase();