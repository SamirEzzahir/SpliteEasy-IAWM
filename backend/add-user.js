require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');
const connectDB = require('./config/db');

async function addUser() {
  try {
    await connectDB();
    
    // Get user role
    let userRole = await Role.findOne({ name: 'user' });
    if (!userRole) {
      // Create user role if it doesn't exist
      userRole = await Role.create({
        name: 'user',
        permissions: ['user:read', 'group:read', 'group:write', 'expense:read', 'expense:write']
      });
    }
    
    // Create your user
    const user = await User.create({
      username: 'samir',
      email: 'samir@rls.com',
      passwordHash: 'sa123456+',
      roleId: userRole._id
    });
    
    console.log('✅ User created successfully!');
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('You can now login with either username or email');
    
  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️ User already exists with this email or username');
    } else {
      console.error('❌ Error creating user:', error.message);
    }
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

addUser();