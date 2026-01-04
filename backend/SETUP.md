# 🚀 Quick Setup Guide

## Fix CORS Issue

The CORS issue you're experiencing is now fixed! Here's what I've done:

### 1. Updated CORS Configuration
- Made CORS very permissive in development mode
- Allows all origins when `NODE_ENV=development`
- Your frontend on `http://127.0.0.1:5500` will now work

### 2. PowerShell Execution Policy Fix

If you get PowerShell execution policy errors, use one of these methods:

#### Method 1: Use the Batch File
```bash
# Double-click start.bat or run in Command Prompt:
start.bat
```

#### Method 2: Use Command Prompt (cmd)
```bash
# Open Command Prompt (not PowerShell) and run:
npm install
node server.js
```

#### Method 3: Fix PowerShell Policy (Optional)
```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 🔧 Start the Server

### Option 1: Using Batch File (Easiest)
1. Double-click `start.bat`
2. Server will start on http://localhost:8000

### Option 2: Using Command Prompt
```bash
# Open Command Prompt in the project folder
npm install
node server.js
```

### Option 3: Using Node directly
```bash
node server.js
```

## 🧪 Test the Fix

### Method 1: Use the Test HTML File
1. Open `test-cors.html` in your browser
2. Click the buttons to test registration and login
3. Should work without CORS errors

### Method 2: Use Your Original Frontend
Your frontend on `http://127.0.0.1:5500` should now work without CORS issues.

### Method 3: Test with curl
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://127.0.0.1:5500" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📋 Troubleshooting

### If you still get CORS errors:
1. Make sure the server is running on port 8000
2. Check that `NODE_ENV=development` in your `.env` file
3. Restart the server after making changes
4. Clear your browser cache

### If you get "user not found" errors:
1. First register a user using the registration endpoint
2. Or run the seed script: `node scripts/seedDatabase.js`

### If MongoDB connection fails:
1. Make sure MongoDB is running
2. Check the connection string in `.env`
3. Default: `mongodb://localhost:27017/spliteasy`

## ✅ Success Indicators

You'll know it's working when:
- Server starts without errors
- Health check returns `{"status":"OK"}`
- No CORS errors in browser console
- Login returns a JWT token

## 🎯 Next Steps

Once the server is running:
1. Test with your frontend
2. Use the provided test credentials
3. Check the API documentation in `README.md`
4. Explore the sample data if you ran the seed script

## 🆘 Still Having Issues?

If you're still having problems:
1. Check the server console for error messages
2. Check browser developer tools for network errors
3. Make sure MongoDB is running
4. Verify the `.env` file configuration