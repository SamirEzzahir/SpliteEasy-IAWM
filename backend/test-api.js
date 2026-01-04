// Simple API test script to verify the application is working
const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api';

async function testAPI() {
  try {
    console.log('🧪 Testing SplitEasy API...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:8000/health');
    console.log('✅ Health check:', healthResponse.data.status);
    
    // Test user registration
    console.log('\n2. Testing user registration...');
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
    console.log('✅ User registered successfully');
    const token = registerResponse.data.data.token;
    
    // Test user login
    console.log('\n3. Testing user login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('✅ User login successful');
    
    // Test authenticated endpoint
    console.log('\n4. Testing authenticated endpoint...');
    const meResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Authenticated request successful');
    console.log('   User:', meResponse.data.data.user.firstName, meResponse.data.data.user.lastName);
    
    // Test group creation
    console.log('\n5. Testing group creation...');
    const groupResponse = await axios.post(`${BASE_URL}/groups`, {
      title: 'Test Group',
      description: 'A test group for API testing',
      type: 'Test',
      currency: 'USD'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Group created successfully');
    const groupId = groupResponse.data.data.group._id;
    
    // Test wallet creation
    console.log('\n6. Testing wallet creation...');
    const walletResponse = await axios.post(`${BASE_URL}/wallets`, {
      name: 'Test Wallet',
      category: 'bank',
      balance: 1000
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Wallet created successfully');
    const walletId = walletResponse.data.data.wallet._id;
    
    // Test expense creation
    console.log('\n7. Testing expense creation...');
    const expenseResponse = await axios.post(`${BASE_URL}/expenses`, {
      groupId: groupId,
      description: 'Test Expense',
      amount: 50.00,
      currency: 'USD',
      category: 'Test',
      walletId: walletId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Expense created successfully');
    
    // Test getting group expenses
    console.log('\n8. Testing expense retrieval...');
    const expensesResponse = await axios.get(`${BASE_URL}/expenses/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Expenses retrieved successfully');
    console.log('   Total expenses:', expensesResponse.data.data.totalExpenses);
    
    // Test balance calculation
    console.log('\n9. Testing balance calculation...');
    const balanceResponse = await axios.get(`${BASE_URL}/settle/${groupId}/balances`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Balances calculated successfully');
    console.log('   Number of members with balances:', balanceResponse.data.data.balances.length);
    
    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Health check');
    console.log('   ✅ User registration');
    console.log('   ✅ User login');
    console.log('   ✅ Authentication');
    console.log('   ✅ Group creation');
    console.log('   ✅ Wallet creation');
    console.log('   ✅ Expense creation');
    console.log('   ✅ Expense retrieval');
    console.log('   ✅ Balance calculation');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Add axios as a dependency if not already installed
if (require.main === module) {
  console.log('Make sure the server is running on http://localhost:8000');
  console.log('Run: npm run dev\n');
  
  setTimeout(() => {
    testAPI();
  }, 2000);
}

module.exports = testAPI;