const axios = require('axios');

async function debugLogin() {
  try {
    console.log('🔍 Debugging login request...\n');
    
    // Test 1: Check server health
    console.log('1. Testing server health...');
    try {
      const healthResponse = await axios.get('http://localhost:8000/health');
      console.log('✅ Server is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Server health check failed:', error.message);
      return;
    }
    
    // Test 2: Check database and create test user
    console.log('\n2. Checking database...');
    try {
      const { spawn } = require('child_process');
      const checkDb = spawn('node', ['check-db.js'], { stdio: 'inherit' });
      
      await new Promise((resolve) => {
        checkDb.on('close', resolve);
      });
    } catch (error) {
      console.log('Database check error:', error.message);
    }
    
    // Test 3: Try login with different payloads
    console.log('\n3. Testing login with various payloads...');
    
    const testCases = [
      {
        name: 'Valid login',
        payload: { email: 'test@example.com', password: 'password123' }
      },
      {
        name: 'Missing password',
        payload: { email: 'test@example.com' }
      },
      {
        name: 'Missing email',
        payload: { password: 'password123' }
      },
      {
        name: 'Empty payload',
        payload: {}
      },
      {
        name: 'Invalid email format',
        payload: { email: 'invalid-email', password: 'password123' }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n   Testing: ${testCase.name}`);
      try {
        const response = await axios.post('http://localhost:8000/api/auth/login', testCase.payload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log(`   ✅ Success:`, response.data);
      } catch (error) {
        console.log(`   ❌ Failed (${error.response?.status}):`, error.response?.data || error.message);
      }
    }
    
    // Test 4: Try registration first, then login
    console.log('\n4. Testing registration + login flow...');
    
    const testUser = {
      username: 'debuguser',
      email: 'debug@example.com',
      password: 'password123',
      firstName: 'Debug',
      lastName: 'User'
    };
    
    try {
      console.log('   Registering user...');
      const regResponse = await axios.post('http://localhost:8000/api/auth/register', testUser);
      console.log('   ✅ Registration successful');
      
      console.log('   Logging in...');
      const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      console.log('   ✅ Login successful:', loginResponse.data.message);
      
    } catch (error) {
      console.log('   ❌ Registration/Login failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Debug script error:', error.message);
  }
}

if (require.main === module) {
  console.log('Make sure the server is running on http://localhost:8000');
  console.log('Starting debug in 2 seconds...\n');
  
  setTimeout(debugLogin, 2000);
}

module.exports = debugLogin;