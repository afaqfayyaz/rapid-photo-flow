package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.exceptions.NotFoundException;
import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.PhotoStatusUpdateRequest;
import com.rapidphotoflow.photos.application.service.PhotoStatusTransitionService;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Command handler for updating photo status.
 * 
 * <p>Validates status transitions and publishes appropriate domain events.
 */
@Service
@RequiredArgsConstructor
public class UpdatePhotoStatusCommandHandler {
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final PhotoStatusTransitionService statusTransitionService;
    
    public ApiResponse<Void> handle(String photoId, PhotoStatusUpdateRequest request) {
        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new NotFoundException("Photo not found: " + photoId));
        
        // Validate transition
        statusTransitionService.validateTransition(photo.getStatus(), request.getStatus());
        
        photo.updateStatus(request.getStatus(), request.getErrorMessage());
        photoRepository.save(photo);
        
        String eventMessage = String.format("Photo status updated to %s", request.getStatus());
        if (request.getErrorMessage() != null) {
            eventMessage += ": " + request.getErrorMessage();
        }
        
        eventPublisher.publish(photoId, EventType.PHOTO_STATUS_CHANGED, eventMessage);
        publishStatusSpecificEvent(photoId, request);
        
        return new ApiResponse<>(
            true,
            "Photo status updated successfully",
            HttpStatus.OK.value(),
            null
        );
    }
    
    private void publishStatusSpecificEvent(String photoId, PhotoStatusUpdateRequest request) {
        PhotoStatus status = request.getStatus();
        if (status == PhotoStatus.PROCESSING) {
            eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_STARTED, "Photo processing started");
        } else if (status == PhotoStatus.COMPLETED) {
            eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_COMPLETED, "Photo processing completed successfully");
        } else if (status == PhotoStatus.FAILED) {
            String errorMsg = request.getErrorMessage() != null ? request.getErrorMessage() : "Unknown error";
            eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_FAILED, "Photo processing failed: " + errorMsg);
        }
    }
}
