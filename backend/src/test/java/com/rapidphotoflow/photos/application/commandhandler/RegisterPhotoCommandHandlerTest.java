package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.PhotoRegisterRequest;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.domain.PhotoQueue;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import com.rapidphotoflow.photos.mapper.PhotoMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegisterPhotoCommandHandlerTest {
    
    @Mock
    private PhotoMapper photoMapper;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @Mock
    private PhotoRepository photoRepository;
    
    @Mock
    private PhotoQueue photoQueue;
    
    @InjectMocks
    private RegisterPhotoCommandHandler handler;
    
    private PhotoRegisterRequest request;
    private Photo photo;
    private PhotoResponse photoResponse;
    
    @BeforeEach
    void setUp() {
        request = new PhotoRegisterRequest();
        request.setCloudinaryPublicId("public-id-1");
        request.setCloudinaryUrl("https://cloudinary.com/photo.jpg");
        request.setOriginalFileName("photo.jpg");
        request.setSizeBytes(1024L);
        request.setContentType("image/jpeg");
        
        photo = Photo.builder()
            .id("photo-1")
            .cloudinaryPublicId("public-id-1")
            .cloudinaryUrl("https://cloudinary.com/photo.jpg")
            .originalFileName("photo.jpg")
            .sizeBytes(1024L)
            .contentType("image/jpeg")
            .build();
        
        photoResponse = PhotoResponse.builder()
            .id("photo-1")
            .cloudinaryPublicId("public-id-1")
            .build();
    }
    
    @Test
    void shouldRegisterPhotoAndEnqueueForProcessing() {
        // Given
        when(photoMapper.toEntity(request)).thenReturn(photo);
        when(photoRepository.save(photo)).thenReturn(photo);
        when(photoMapper.toResponse(photo)).thenReturn(photoResponse);
        
        // When
        ApiResponse<PhotoResponse> response = handler.handle(request);
        
        // Then
        assertTrue(response.isStatus());
        assertEquals(201, response.getStatusCode());
        assertNotNull(response.getData());
        
        verify(photoRepository).save(photo);
        verify(eventPublisher).publish(
            eq("photo-1"),
            eq(EventType.PHOTO_UPLOADED),
            eq("Photo uploaded: photo.jpg")
        );
        verify(photoQueue).enqueue("photo-1");
    }
}

