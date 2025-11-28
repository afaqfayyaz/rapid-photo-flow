# How to Run RapidPhotoFlow

## ✅ Backend Status
The backend is **already running** on `http://localhost:8080` using the Maven wrapper (no global Maven needed)!

## Frontend Setup

### Option 1: Install Node.js with Homebrew (Recommended)
```bash
brew install node
```

Then run:
```bash
cd frontend
npm install
npm run dev
```

### Option 2: Use nvm (Node Version Manager) - Like Maven Wrapper
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or run:
source ~/.nvm/nvm.sh

# Install Node.js
nvm install 18
nvm use 18

# Then run frontend
cd frontend
npm install
npm run dev
```

## Quick Start Commands

### Backend (Already Running)
```bash
cd backend
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Access URLs
- **Backend API**: http://localhost:8080
- **Frontend**: http://localhost:3000 (after starting)

## Note
The Maven wrapper (`./mvnw`) automatically downloads Maven to `~/.m2/wrapper/` - no global installation needed, just like IntelliJ!

