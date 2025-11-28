package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.exceptions.NotFoundException;
import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.BulkStatusUpdateRequest;
import com.rapidphotoflow.photos.application.service.PhotoStatusTransitionService;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BulkUpdatePhotoStatusCommandHandler {
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final PhotoStatusTransitionService statusTransitionService;
    
    @Transactional
    public ApiResponse<Void> handle(BulkStatusUpdateRequest request) {
        List<Photo> photos = photoRepository.findByIdIn(request.getPhotoIds());
        
        if (photos.size() != request.getPhotoIds().size()) {
            throw new NotFoundException("Some photos were not found");
        }
        
        photos.forEach(photo -> {
            // Validate transition
            statusTransitionService.validateTransition(photo.getStatus(), request.getStatus());
            photo.updateStatus(request.getStatus(), request.getErrorMessage());
            publishStatusEvents(photo.getId(), request);
        });
        
        photoRepository.saveAll(photos);
        
        String message = String.format("Updated status for %d photos", photos.size());
        
        return new ApiResponse<>(
            true,
            message,
            HttpStatus.OK.value(),
            null
        );
    }
    
    private void publishStatusEvents(String photoId, BulkStatusUpdateRequest request) {
        String eventMessage = String.format("Photo status updated to %s", request.getStatus());
        if (request.getErrorMessage() != null) {
            eventMessage += ": " + request.getErrorMessage();
        }
        
        eventPublisher.publish(photoId, EventType.PHOTO_STATUS_CHANGED, eventMessage);
        
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
