# Quick Start Guide

## ✅ Current Status

### Backend: **RUNNING** ✅
- **URL**: http://localhost:8080
- **Status**: Active and responding
- **Maven Wrapper**: Working (no global Maven needed)

### Frontend: **Needs Node.js** ⚠️

## To Complete Setup:

### 1. Install Node.js (if not already installed)
```bash
brew install node
```

Or check if it's already installed:
```bash
node --version
npm --version
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend will start on: **http://localhost:3000**

## Verify Backend is Running
```bash
curl http://localhost:8080/api/photos
```

Should return: `{"status":true,"message":"Photos fetched successfully",...}`

## Access the Application
- **Frontend UI**: http://localhost:3000 (after starting frontend)
- **Backend API**: http://localhost:8080/api/photos
- **H2 Console**: http://localhost:8080/h2-console

## Stop Backend
If you need to stop the backend:
```bash
# Find the process
ps aux | grep spring-boot:run

# Kill it (replace PID with actual process ID)
kill <PID>
```

Or just press `Ctrl+C` in the terminal where it's running.

