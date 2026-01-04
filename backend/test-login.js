const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    // First, let's test if we can register a user
    console.log('\n1. Testing registration...');
    try {
      const registerResponse = await axios.post('http://localhost:8000/api/auth/register', {
        username: 'testuser123',
        email: 'testuser123@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });
      console.log('✅ Registration successful');
    } catch (regError) {
      if (regError.response?.status === 400 && regError.response?.data?.message?.includes('already exists')) {
        console.log('ℹ️ User already exists, continuing with login test');
      } else {
        console.log('❌ Registration failed:', regError.response?.data || regError.message);
      }
    }
    
    // Now test login
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'testuser123@example.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5500'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', loginResponse.data);
    
  } catch (error) {
    console.log('❌ Login failed:');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Headers:', error.response?.headers);
  }
}

// Test with different origins
async function testCORS() {
  const origins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ];
  
  for (const origin of origins) {
    try {
      console.log(`\nTesting CORS with origin: ${origin}`);
      const response = await axios.post('http://localhost:8000/api/auth/login', {
        email: 'testuser123@example.com',
        password: 'password123'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Origin': origin
        }
      });
      console.log(`✅ ${origin} - Success`);
    } catch (error) {
      console.log(`❌ ${origin} - Failed:`, error.response?.status, error.response?.data?.message || error.message);
    }
  }
}

if (require.main === module) {
  console.log('Make sure the server is running on http://localhost:8000\n');
  testLogin().then(() => {
    console.log('\n--- Testing CORS with different origins ---');
    return testCORS();
  });
}

module.exports = { testLogin, testCORS };