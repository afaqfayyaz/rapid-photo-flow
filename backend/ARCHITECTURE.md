# RapidPhotoFlow Backend Architecture

## Overview

RapidPhotoFlow is a showcase-quality, event-driven, queue-based photo processing service built with Spring Boot. The architecture demonstrates clean layering, separation of concerns, and professional engineering practices suitable for a FAANG-level codebase.

## Architecture Principles

- **Clean Layering**: Clear separation between web, application, domain, and infrastructure layers
- **Queue-Based Processing**: In-memory queue replaces database polling for async processing
- **Event-Driven Design**: Domain events capture workflow history
- **Status Transition Validation**: Enforces valid state machine transitions
- **Robust Error Handling**: Comprehensive exception handling with meaningful responses

## Package Structure

```
com.rapidphotoflow/
├── common/              # Shared utilities and exceptions
│   ├── exceptions/      # Global exception handler, custom exceptions
│   └── querydto/        # ApiResponse wrapper
├── config/              # Spring Boot configuration
├── photos/              # Photo domain module
│   ├── api/             # Web layer (controllers, DTOs)
│   ├── application/     # Application layer
│   │   ├── commandhandler/  # CQRS command handlers
│   │   ├── queryhandler/     # CQRS query handlers
│   │   ├── service/          # Domain services (status transitions)
│   │   └── worker/           # Background processing worker
│   ├── domain/          # Domain layer
│   │   ├── event/        # Domain events
│   │   └── PhotoQueue    # Queue abstraction
│   └── infrastructure/  # Infrastructure layer
│       ├── entity/       # MongoDB entities
│       ├── repository/   # Data access
│       └── queue/         # Queue implementation
└── events/               # Event module
    ├── api/              # Event API
    ├── application/      # Event handlers
    ├── domain/           # Event types
    └── infrastructure/   # Event persistence
```

## Core Components

### 1. Queue-Based Processing Pipeline

#### PhotoQueue (Domain Interface)
- Abstraction for photo processing queue
- Methods: `enqueue(String photoId)`, `take()`, `size()`

#### InMemoryPhotoQueue (Infrastructure)
- Thread-safe in-memory implementation using `BlockingQueue`
- Suitable for single-instance applications

#### PhotoProcessingWorker (Application)
- Background worker thread started on application startup
- Continuously processes photos from the queue:
  1. Takes photo ID from queue (blocking)
  2. Updates status to PROCESSING
  3. Simulates processing work (1-3 second delay)
  4. Updates status to COMPLETED (90% success) or FAILED (10% failure)
  5. Publishes domain events
- Never terminates; handles all exceptions gracefully

### 2. Status Transition Validation

#### PhotoStatusTransitionService
- Validates status transitions according to state machine:
  - UPLOADED → PROCESSING, FAILED
  - PROCESSING → COMPLETED, FAILED
  - COMPLETED → REVIEWED
  - REVIEWED → (terminal)
  - FAILED → UPLOADED (retry)
- Throws `ValidationException` for invalid transitions

### 3. Event-Driven Design

#### Domain Events
- `PhotoDomainEvent` - Base class for all photo events
- `PhotoUploadedEvent` - Published when photo is registered
- `PhotoProcessingStartedEvent` - Published when processing begins
- `PhotoProcessingCompletedEvent` - Published on success
- `PhotoProcessingFailedEvent` - Published on failure
- `PhotoStatusChangedEvent` - Published on any status change

#### EventPublisher
- Centralized event publishing
- Persists events to MongoDB via `CreateEventCommandHandler`
- Events are queryable via `/api/events` endpoint

### 4. REST API

#### Photo Endpoints
- `POST /api/photos/bulk` - Register multiple photos (enqueues for processing)
- `GET /api/photos` - List photos (with optional status filter and pagination)
- `GET /api/photos/{id}` - Get photo by ID
- `GET /api/photos/completed` - Get completed photos
- `PATCH /api/photos/{id}/status` - Update photo status (with validation)
- `DELETE /api/photos/{id}` - Delete photo
- `DELETE /api/photos/bulk` - Bulk delete

#### Event Endpoints
- `GET /api/events` - List all events
- `GET /api/events?photoId={id}` - Get events for a specific photo

#### Response Format
All responses use `ApiResponse<T>`:
```json
{
  "success": true,
  "message": "Operation completed",
  "statusCode": 200,
  "data": { ... }
}
```

### 5. Error Handling

#### GlobalExceptionHandler
- `NotFoundException` → 404
- `ValidationException` → 400
- `MethodArgumentNotValidException` → 400 (with field errors)
- `IllegalArgumentException` → 400
- Generic exceptions → 500

All errors return consistent `ApiResponse` format.

## Processing Flow

1. **Photo Registration**
   - Frontend uploads to Cloudinary
   - Frontend calls `POST /api/photos/bulk` with photo metadata
   - Backend creates photo records with status UPLOADED
   - Photos are enqueued for processing
   - `PHOTO_UPLOADED` event is published

2. **Async Processing**
   - Worker thread takes photo from queue
   - Status updated to PROCESSING
   - `PHOTO_PROCESSING_STARTED` event published
   - Simulated processing work (1-3 seconds)
   - Status updated to COMPLETED or FAILED
   - `PHOTO_PROCESSING_COMPLETED` or `PHOTO_PROCESSING_FAILED` event published

3. **Review**
   - User reviews completed photos
   - Status can be manually updated to REVIEWED
   - `PHOTO_STATUS_CHANGED` event published

## Key Design Decisions

1. **In-Memory Queue**: Simple, hackathon-friendly, no external dependencies
2. **BlockingQueue**: Natural backpressure, worker blocks when queue is empty
3. **Status Transition Validation**: Prevents invalid state changes
4. **Event Persistence**: All events stored for workflow history
5. **Graceful Error Handling**: Worker never crashes, photos marked as FAILED on errors
6. **CQRS Pattern**: Clear separation of commands and queries
7. **Clean Layering**: Domain logic separated from infrastructure

## Testing Strategy

- Unit tests for status transition validation
- Integration tests for queue → worker → events flow
- Tests verify valid transitions and reject invalid ones

## Future Enhancements (Out of Scope)

- Distributed queue (Redis/RabbitMQ) for multi-instance deployments
- Retry mechanism for failed photos
- Processing metrics and monitoring
- WebSocket for real-time status updates
- Photo metadata extraction and analysis

