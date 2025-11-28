# Setup Instructions

## Prerequisites Installation

### Install Maven
```bash
brew install maven
```

### Install Node.js and npm
```bash
brew install node
```

## Running the Project

### 1. Start Backend (Terminal 1)
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Backend will run on: `http://localhost:8080`

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:3000`

## Quick Install Script

Run this to install all prerequisites:
```bash
brew install maven node
```

## Verify Installation

```bash
# Check Java (should be 17+)
java -version

# Check Maven
mvn -version

# Check Node.js
node -version
npm -version
```

