package com.rapidphotoflow.photos.application.service;

import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhotoStatusTransitionServiceTest {
    
    private PhotoStatusTransitionService service;
    
    @BeforeEach
    void setUp() {
        service = new PhotoStatusTransitionService();
    }
    
    @Test
    void shouldAllowTransitionFromUploadedToProcessing() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.PROCESSING)
        );
    }
    
    @Test
    void shouldAllowTransitionFromUploadedToFailed() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.FAILED)
        );
    }
    
    @Test
    void shouldAllowTransitionFromProcessingToCompleted() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.PROCESSING, PhotoStatus.COMPLETED)
        );
    }
    
    @Test
    void shouldAllowTransitionFromProcessingToFailed() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.PROCESSING, PhotoStatus.FAILED)
        );
    }
    
    @Test
    void shouldAllowTransitionFromCompletedToReviewed() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.COMPLETED, PhotoStatus.REVIEWED)
        );
    }
    
    @Test
    void shouldAllowTransitionFromFailedToUploaded() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.FAILED, PhotoStatus.UPLOADED)
        );
    }
    
    @Test
    void shouldAllowNoOpTransition() {
        assertDoesNotThrow(() -> 
            service.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.UPLOADED)
        );
    }
    
    @Test
    void shouldRejectInvalidTransitionFromUploadedToCompleted() {
        ValidationException exception = assertThrows(ValidationException.class, () -> 
            service.validateTransition(PhotoStatus.UPLOADED, PhotoStatus.COMPLETED)
        );
        assertTrue(exception.getMessage().contains("Invalid status transition"));
    }
    
    @Test
    void shouldRejectInvalidTransitionFromProcessingToUploaded() {
        ValidationException exception = assertThrows(ValidationException.class, () -> 
            service.validateTransition(PhotoStatus.PROCESSING, PhotoStatus.UPLOADED)
        );
        assertTrue(exception.getMessage().contains("Invalid status transition"));
    }
    
    @Test
    void shouldRejectInvalidTransitionFromCompletedToProcessing() {
        ValidationException exception = assertThrows(ValidationException.class, () -> 
            service.validateTransition(PhotoStatus.COMPLETED, PhotoStatus.PROCESSING)
        );
        assertTrue(exception.getMessage().contains("Invalid status transition"));
    }
    
    @Test
    void shouldRejectInvalidTransitionFromReviewedToAnyStatus() {
        ValidationException exception = assertThrows(ValidationException.class, () -> 
            service.validateTransition(PhotoStatus.REVIEWED, PhotoStatus.COMPLETED)
        );
        assertTrue(exception.getMessage().contains("Invalid status transition"));
    }
}

