// Quick CORS fix - replace the CORS configuration in server.js with this simpler version

const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
};

console.log('Use this CORS configuration in server.js for development:');
console.log(corsOptions);