@echo off
echo Starting SplitEasy Backend Server...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
node server.js

pause