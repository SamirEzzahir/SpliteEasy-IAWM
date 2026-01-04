# 🚀 SplitEasy Backend - Quick Start Guide

Get your SplitEasy backend up and running in minutes!

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)

## 🏃‍♂️ Quick Setup (5 minutes)

### 1. Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd spliteasy-backend

# Install dependencies
npm install
```

### 2. Start MongoDB
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Windows (if installed as service)
net start MongoDB

# Or run manually
mongod --dbpath /path/to/your/db
```

### 3. Configure Environment
```bash
# The .env file is already configured with development defaults
# Just make sure MongoDB is running on the default port (27017)
```

### 4. Seed Database (Optional)
```bash
# Add sample data for testing
npm run seed
```

### 5. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

### 6. Test the API
```bash
# Run the API test script
node test-api.js
```

## 🎯 You're Ready!

Your API is now running at: **http://localhost:8000**

### Test Credentials (if you ran the seed script):
- **Admin**: admin@spliteasy.com / admin123
- **Alice**: alice@example.com / password123
- **Bob**: bob@example.com / password123
- **Charlie**: charlie@example.com / password123
- **Diana**: diana@example.com / password123

## 🔗 Quick API Test

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. Register a User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📚 Next Steps

1. **API Documentation**: Check `README.md` for complete API documentation
2. **Frontend Integration**: Use the JWT token for authenticated requests
3. **Database**: Explore your data at `mongodb://localhost:27017/spliteasy`
4. **Logs**: Check the `logs/` directory for application logs

## 🛠 Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Seed database with sample data
npm run seed

# Run tests
npm test

# Start production server
npm start
```

## 🔧 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or change port in .env file
PORT=3001
```

### Permission Issues
```bash
# Fix file permissions
chmod +x scripts/seedDatabase.js
```

## 📞 Need Help?

- Check the main `README.md` for detailed documentation
- Review error logs in the `logs/` directory
- Ensure all prerequisites are installed and running
- Verify your `.env` configuration matches your setup

## 🎉 Success!

If you see this message when running the test script, you're all set:
```
🎉 All API tests passed successfully!
```

Your SplitEasy backend is ready for development! 🚀