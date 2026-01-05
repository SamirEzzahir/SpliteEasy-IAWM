require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const WebSocket = require('ws');

const connectDB = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const walletRoutes = require('./routes/wallets');
const friendRoutes = require('./routes/friends');
const activityRoutes = require('./routes/activity');
const notificationRoutes = require('./routes/notifications');
const incomeRoutes = require('./routes/incomes');
const incomeTypeRoutes = require('./routes/incometype');
const statsRoutes = require('./routes/stats');
const transactionRoutes = require('./routes/transactions');
const debtsLoansRoutes = require('./routes/debts-loans');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(compression());

/* // Rate limiting - More permissive in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => {
    // Skip rate limiting for preflight OPTIONS requests in development
    return process.env.NODE_ENV === 'development' && req.method === 'OPTIONS';
  }
});
app.use(limiter); */

// CORS configuration - Permissive for development
let corsOptions;

if (process.env.NODE_ENV === 'development') {
  // Very permissive CORS for development
  corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all localhost and 127.0.0.1 origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow any other origin in development
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept', 'X-HTTP-Method-Override'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    preflightContinue: false,
    optionsSuccessStatus: 200
  };
  console.log('🔓 Development mode: CORS allows all origins');
} else {
  // Restrictive CORS for production
  corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
      
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.status(200).json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settle', settlementRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/Notifications', notificationRoutes); // Also handle capital N for compatibility
app.use('/api/incomes', incomeRoutes);
app.use('/api/incometype', incomeTypeRoutes);
app.use('/api/incometype/', incomeTypeRoutes); // Handle trailing slash
app.use('/api/stats', statsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/debts-loans', debtsLoansRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 8001;

const server = http.createServer(app);

// WebSocket server for notifications
const wss = new WebSocket.Server({ 
  server,
  path: '/api/notifications/ws'
});

// Store active WebSocket connections
const wsConnections = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.pathname.split('/').pop();
  
  console.log(`WebSocket connected for user: ${userId}`);
  
  // Store connection
  wsConnections.set(userId, ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connected successfully'
  }));
  
  ws.on('close', () => {
    console.log(`WebSocket disconnected for user: ${userId}`);
    wsConnections.delete(userId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
    wsConnections.delete(userId);
  });
});

// Function to send notification to specific user
global.sendNotificationToUser = (userId, notification) => {
  const ws = wsConnections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(notification));
  }
};

server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`WebSocket server running on ws://localhost:${PORT}/api/notifications/ws`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;