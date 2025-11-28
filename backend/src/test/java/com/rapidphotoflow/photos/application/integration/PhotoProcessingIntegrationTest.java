package com.rapidphotoflow.photos.application.integration;

import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.events.infrastructure.repository.EventRepository;
import com.rapidphotoflow.photos.api.dto.PhotoRegisterRequest;
import com.rapidphotoflow.photos.application.commandhandler.RegisterPhotoCommandHandler;
import com.rapidphotoflow.photos.application.service.PhotoStatusTransitionService;
import com.rapidphotoflow.photos.domain.PhotoQueue;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for the complete photo processing flow:
 * Registration → Queue → Processing → Status Update → Events
 */
@SpringBootTest
@ActiveProfiles("test")
class PhotoProcessingIntegrationTest {
    
    @Autowired
    private RegisterPhotoCommandHandler registerHandler;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private PhotoQueue photoQueue;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private PhotoStatusTransitionService statusTransitionService;
    
    @BeforeEach
    void setUp() {
        photoRepository.deleteAll();
        eventRepository.deleteAll();
    }
    
    @Test
    void shouldEnqueuePhotoAfterRegistration() {
        // Given
        PhotoRegisterRequest request = createValidPhotoRequest();
        
        // When
        registerHandler.handle(request);
        
        // Then
        assertEquals(1, photoQueue.size(), "Photo should be enqueued");
        
        Optional<Photo> photo = photoRepository.findByCloudinaryPublicId(request.getCloudinaryPublicId());
        assertTrue(photo.isPresent());
        assertEquals(PhotoStatus.UPLOADED, photo.get().getStatus());
    }
    
    @Test
    void shouldPublishEventOnPhotoRegistration() {
        // Given
        PhotoRegisterRequest request = createValidPhotoRequest();
        
        // When
        registerHandler.handle(request);
        
        // Then
        long eventCount = eventRepository.findAll().stream()
            .filter(e -> e.getEventType() == EventType.PHOTO_UPLOADED)
            .count();
        
        assertEquals(1, eventCount, "PHOTO_UPLOADED event should be published");
    }
    
    @Test
    void shouldValidateStatusTransitions() {
        // Valid transitions
        assertDoesNotThrow(() -> 
            statusTransitionService.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.PROCESSING)
        );
        
        assertDoesNotThrow(() -> 
            statusTransitionService.validateTransition(PhotoStatus.PROCESSING, PhotoStatus.COMPLETED)
        );
        
        // Invalid transition
        ValidationException exception = assertThrows(ValidationException.class, () -> 
            statusTransitionService.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.COMPLETED)
        );
        
        assertTrue(exception.getMessage().contains("Invalid status transition"));
    }
    
    @Test
    void shouldProcessPhotoFromQueue() throws InterruptedException {
        // Given
        PhotoRegisterRequest request = createValidPhotoRequest();
        registerHandler.handle(request);
        
        // When - take photo from queue
        String photoId = photoQueue.take();
        
        // Then
        assertNotNull(photoId);
        Optional<Photo> photo = photoRepository.findById(photoId);
        assertTrue(photo.isPresent());
        assertEquals(PhotoStatus.UPLOADED, photo.get().getStatus());
    }
    
    private PhotoRegisterRequest createValidPhotoRequest() {
        PhotoRegisterRequest request = new PhotoRegisterRequest();
        request.setCloudinaryPublicId("test-photo-" + System.currentTimeMillis());
        request.setCloudinaryUrl("https://res.cloudinary.com/test/image/upload/test.jpg");
        request.setOriginalFileName("test.jpg");
        request.setSizeBytes(1024L);
        request.setContentType("image/jpeg");
        return request;
    }
}

