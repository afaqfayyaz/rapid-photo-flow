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
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Command handler for registering a single photo.
 * 
 * <p>After creating the photo record, it:
 * <ul>
 *   <li>Publishes a PHOTO_UPLOADED event</li>
 *   <li>Enqueues the photo for processing</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class RegisterPhotoCommandHandler {
    private final PhotoMapper photoMapper;
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final PhotoQueue photoQueue;
    
    public ApiResponse<PhotoResponse> handle(PhotoRegisterRequest request) {
        Photo photo = photoMapper.toEntity(request);
        Photo saved = photoRepository.save(photo);
        
        eventPublisher.publish(
            saved.getId(),
            EventType.PHOTO_UPLOADED,
            "Photo uploaded: " + saved.getOriginalFileName()
        );
        
        // Enqueue for processing
        photoQueue.enqueue(saved.getId());
        
        return new ApiResponse<>(
            true,
            "Photo registered successfully",
            HttpStatus.CREATED.value(),
            photoMapper.toResponse(saved)
        );
    }
}

