# RapidPhotoFlow - System Documentation

## Overview

RapidPhotoFlow is a photo processing pipeline that handles uploads, asynchronous processing, and review workflows. Built with React frontend and Spring Boot backend, using a queue-based architecture.

## Architecture

```
Frontend (React) → Backend (Spring Boot) → MongoDB
                          ↓
                    In-Memory Queue
                          ↓
                   Background Worker
```

## Frontend Workflow

### User Journey

**1. Upload Photos** (`/`)
- User selects multiple photos → Uploads to Cloudinary → Registers metadata with backend
- Photos automatically enqueued for processing
- Real-time upload progress displayed

**2. Processing Queue** (`/processing`)
- Shows photos being processed (`UPLOADED` → `PROCESSING`)
- Auto-refreshes every 2 seconds to show status updates
- Visual queue with status indicators

**3. Review Photos** (`/review`)
- Displays completed photos (`COMPLETED` and `REVIEWED`)
- User can mark as reviewed, delete, or perform bulk operations
- Filtering and sorting available

**4. Event Log** (`/events`)
- Complete workflow history with all events
- Filterable by photo or event type

## Backend Workflow

### Processing Flow

**1. Photo Registration**
```
Frontend uploads to Cloudinary → Calls backend API
→ Backend creates Photo (status: UPLOADED)
→ Photo enqueued → Event published → Response sent
```

**2. Async Processing (Queue-Based)**
```
Worker thread continuously:
  → Takes photo from queue (blocking)
  → Updates to PROCESSING → Publishes event
  → Simulates work (1-3 sec delay)
  → Updates to COMPLETED (90%) or FAILED (10%)
  → Publishes completion/failure event
```

**3. Status Updates**
```
User action → API call → Status validation
→ Update photo → Publish event → Response
```

### Key Components

- **PhotoQueue**: In-memory blocking queue for processing
- **PhotoProcessingWorker**: Background thread that processes queue
- **PhotoStatusTransitionService**: Validates state machine transitions
- **EventPublisher**: Publishes and persists all domain events

## Photo Lifecycle

```
UPLOADED → PROCESSING → COMPLETED → REVIEWED
              ↓
           FAILED (10% chance, can retry)
```

**Events**: Every action generates an event (uploaded, processing started, completed, failed, status changed, deleted). All events are persisted and queryable.

## Key Design Decisions

- **Queue-Based**: In-memory queue replaces database polling for efficient async processing
- **Status Validation**: State machine enforces valid transitions (UPLOADED → PROCESSING → COMPLETED → REVIEWED)
- **Event-Driven**: All actions generate events for complete audit trail
- **Clean Architecture**: Layered design (Web → Application → Domain → Infrastructure)

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Cloudinary SDK
- **Backend**: Spring Boot 3.2.0, MongoDB, Java 17, In-memory BlockingQueue

## Quick Start

```bash
# Backend
cd backend && ./mvnw spring-boot:run
# Runs on http://localhost:8080

# Frontend  
cd frontend && npm install && npm run dev
# Runs on http://localhost:3000
```

**Prerequisites**: MongoDB (localhost:27017), Java 17+, Node.js 18+

