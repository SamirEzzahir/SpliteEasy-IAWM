require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function resetUserPassword() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: 'samir@rls.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 Found user:', user.firstName, user.lastName);
    console.log('📧 Email:', user.email);
    
    // Reset password to 'password123'
    user.passwordHash = 'password123';
    await user.save();
    
    console.log('✅ Password reset to: password123');
    console.log('\nYou can now login with:');
    console.log('Email: samir@rls.com');
    console.log('Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

resetUserPassword();