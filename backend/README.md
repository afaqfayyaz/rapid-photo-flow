# RapidPhotoFlow Backend

Spring Boot backend with vertical slices architecture and CQRS pattern.

## Quick Start

```bash
# Build the project
mvn clean install

# Run the application
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

## Architecture

- **Vertical Slices**: Each feature (photos, processing, events) is self-contained
- **CQRS**: Separate command and query handlers
- **Clean Code**: Following SOLID principles and best practices

## Testing

```bash
mvn test
```

## H2 Console

Access the H2 console at: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:rapidphotodb`
- Username: `sa`
- Password: (empty)

