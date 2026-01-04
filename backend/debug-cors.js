// Simple CORS debug script
const express = require('express');
const cors = require('cors');

const app = express();

// Very permissive CORS for debugging
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Simple test endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  console.log('Origin:', req.get('Origin'));
  console.log('Headers:', req.headers);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  res.json({
    success: true,
    message: 'Login successful (debug mode)',
    data: {
      user: { email },
      token: 'debug-token'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Debug server running' });
});

const PORT = 8001;
app.listen(PORT, () => {
  console.log(`Debug server running on http://localhost:${PORT}`);
  console.log('Try your login request against http://localhost:8001/api/auth/login');
});