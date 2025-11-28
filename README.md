# RapidPhotoFlow

A lightweight photo upload → processing → review workflow application built with Spring Boot (backend) and React (frontend).

## Features

- ✅ Concurrent photo uploads
- ✅ Async processing simulation
- ✅ Real-time status tracking
- ✅ Event logging
- ✅ Modern, responsive UI
- ✅ Clean architecture with vertical slices and CQRS pattern

## Architecture

### Backend
- **Framework**: Spring Boot 3.2.0
- **Pattern**: Vertical Slices + CQRS
- **Database**: Mongo DB
- **Java Version**: 17
- **Unit Test**: JUnit 5

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Pattern**: Feature-based with core/shared modules

## Project Structure

```
rapid-photo-flow/
├── backend/          # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   └── java/com/rapidphotoflow/
│   │   │       ├── slices/      # Vertical slices
│   │   │       │   ├── photos/
│   │   │       │   ├── processing/
│   │   │       │   └── events/
│   │   │       ├── common/      # Shared components
│   │   │       └── config/      # Configuration
│   │   └── test/                # Unit tests
│   └── pom.xml
│
└── frontend/         # React frontend
    ├── src/
    │   ├── app/
    │   │   ├── features/        # Feature modules
    │   │   ├── core/            # Core services
    │   │   ├── shared/          # Shared components
    │   │   └── models/          # Type definitions
    │   └── assets/
    └── package.json
```

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Build and run the application:
```bash
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

## API Endpoints

### Photos
- `POST /api/photos` - Create photo record
- `GET /api/photos/{id}` - Get photo by ID
- `GET /api/photos?status={status}` - Get all photos (optional filter)
- `PATCH /api/photos/{id}/status` - Update photo status

### Processing
- `POST /api/processing/{id}/process` - Trigger photo processing
- `GET /api/processing/queue` - Get processing queue

### Events
- `GET /api/events?photoId={id}` - Get events for a photo
- `GET /api/events` - Get all events

## Usage

1. **Upload Photos**: Go to the Upload page and select multiple photos to upload
2. **Monitor Processing**: Check the Processing Queue page to see photos being processed
3. **Review Photos**: Once processing is complete, review photos on the Review page

## Testing

### Backend Tests
```bash
cd backend
mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Technology Stack

### Backend
- Spring Boot 3.2.0
- Spring Data JPA
- Mongo DB
- Lombok
- JUnit 5
- Mockito

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- CSS Modules

## Design Patterns

- **Vertical Slices**: Each feature (photos, processing, events) is self-contained
- **CQRS**: Separate command and query handlers
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Constructor-based DI throughout
- **Clean Architecture**: Layered design (Web → Application → Domain → Infrastructure) for maintainability.

## Loom Video

- https://www.loom.com/share/a3a41dc6498e4fd5b85e1c799450857e

## License

MIT

