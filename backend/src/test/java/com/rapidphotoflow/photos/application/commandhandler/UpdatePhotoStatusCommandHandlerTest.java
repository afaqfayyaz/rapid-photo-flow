package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.exceptions.NotFoundException;
import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.PhotoStatusUpdateRequest;
import com.rapidphotoflow.photos.application.service.PhotoStatusTransitionService;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpdatePhotoStatusCommandHandlerTest {
    
    @Mock
    private PhotoRepository photoRepository;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @Mock
    private PhotoStatusTransitionService statusTransitionService;
    
    @InjectMocks
    private UpdatePhotoStatusCommandHandler handler;
    
    private Photo photo;
    
    @BeforeEach
    void setUp() {
        photo = Photo.builder()
            .id("photo-1")
            .cloudinaryPublicId("public-id-1")
            .cloudinaryUrl("https://cloudinary.com/photo.jpg")
            .originalFileName("photo.jpg")
            .sizeBytes(1024L)
            .contentType("image/jpeg")
            .status(PhotoStatus.UPLOADED)
            .build();
    }
    
    @Test
    void shouldUpdatePhotoStatusSuccessfully() {
        // Given
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(PhotoStatus.PROCESSING);
        
        when(photoRepository.findById("photo-1")).thenReturn(Optional.of(photo));
        when(photoRepository.save(any(Photo.class))).thenReturn(photo);
        
        // When
        ApiResponse<Void> response = handler.handle("photo-1", request);
        
        // Then
        assertTrue(response.isStatus());
        assertEquals(200, response.getStatusCode());
        verify(statusTransitionService).validateTransition(PhotoStatus.UPLOADED, PhotoStatus.PROCESSING);
        verify(photoRepository).save(photo);
        verify(eventPublisher).publish(eq("photo-1"), eq(EventType.PHOTO_STATUS_CHANGED), anyString());
        verify(eventPublisher).publish(eq("photo-1"), eq(EventType.PHOTO_PROCESSING_STARTED), anyString());
    }
    
    @Test
    void shouldThrowNotFoundExceptionWhenPhotoNotFound() {
        // Given
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(PhotoStatus.PROCESSING);
        
        when(photoRepository.findById("photo-1")).thenReturn(Optional.empty());
        
        // When/Then
        assertThrows(NotFoundException.class, () -> 
            handler.handle("photo-1", request)
        );
        
        verify(photoRepository, never()).save(any());
        verify(eventPublisher, never()).publish(anyString(), any(), anyString());
    }
    
    @Test
    void shouldValidateStatusTransition() {
        // Given
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(PhotoStatus.COMPLETED);
        
        when(photoRepository.findById("photo-1")).thenReturn(Optional.of(photo));
        doThrow(new ValidationException("Invalid transition"))
            .when(statusTransitionService)
            .validateTransition(PhotoStatus.UPLOADED, PhotoStatus.COMPLETED);
        
        // When/Then
        assertThrows(ValidationException.class, () -> 
            handler.handle("photo-1", request)
        );
        
        verify(photoRepository, never()).save(any());
    }
    
    @Test
    void shouldPublishCompletedEventWhenStatusIsCompleted() {
        // Given
        photo.setStatus(PhotoStatus.PROCESSING);
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(PhotoStatus.COMPLETED);
        
        when(photoRepository.findById("photo-1")).thenReturn(Optional.of(photo));
        when(photoRepository.save(any(Photo.class))).thenReturn(photo);
        
        // When
        handler.handle("photo-1", request);
        
        // Then
        verify(eventPublisher).publish(eq("photo-1"), eq(EventType.PHOTO_PROCESSING_COMPLETED), anyString());
    }
    
    @Test
    void shouldPublishFailedEventWhenStatusIsFailed() {
        // Given
        photo.setStatus(PhotoStatus.PROCESSING);
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(PhotoStatus.FAILED);
        request.setErrorMessage("Processing error");
        
        when(photoRepository.findById("photo-1")).thenReturn(Optional.of(photo));
        when(photoRepository.save(any(Photo.class))).thenReturn(photo);
        
        // When
        handler.handle("photo-1", request);
        
        // Then
        verify(eventPublisher).publish(eq("photo-1"), eq(EventType.PHOTO_PROCESSING_FAILED), anyString());
    }
}

