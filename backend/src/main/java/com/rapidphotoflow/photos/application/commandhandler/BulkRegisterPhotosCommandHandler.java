package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.BulkPhotoRegisterRequest;
import com.rapidphotoflow.photos.api.dto.BulkRegistrationItemResult;
import com.rapidphotoflow.photos.api.dto.PhotoRegisterRequest;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import com.rapidphotoflow.photos.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BulkRegisterPhotosCommandHandler {
    private final PhotoMapper photoMapper;
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final com.rapidphotoflow.photos.domain.PhotoQueue photoQueue;
    
    @Transactional
    public ApiResponse<List<BulkRegistrationItemResult>> handle(BulkPhotoRegisterRequest request) {
        List<PhotoRegisterRequest> photos = request.getPhotos();
        
        // Step 1: Validate and create entities
        List<Photo> photosToSave = new ArrayList<>();
        for (PhotoRegisterRequest registerRequest : photos) {
            registerRequest.validate();
            Photo photo = photoMapper.toEntity(registerRequest);
            photosToSave.add(photo);
        }
        
        // Step 2: Batch save all photos
        List<Photo> savedPhotos = photoRepository.saveAll(photosToSave);
        
        // Step 3: Publish events, enqueue for processing, and build results
        List<BulkRegistrationItemResult> results = new ArrayList<>();
        for (Photo savedPhoto : savedPhotos) {
                        eventPublisher.publish(
                savedPhoto.getId(),
                            EventType.PHOTO_UPLOADED,
                "Photo uploaded: " + savedPhoto.getOriginalFileName()
                        );
            
            // Enqueue for processing
            photoQueue.enqueue(savedPhoto.getId());
                
            PhotoResponse response = photoMapper.toResponse(savedPhoto);
                results.add(BulkRegistrationItemResult.builder()
                .cloudinaryPublicId(savedPhoto.getCloudinaryPublicId())
                    .success(true)
                    .photo(response)
                    .error(null)
                    .build());
        }
        
        String message = String.format("Processed %d photos", photos.size());
        
        return new ApiResponse<>(
            true,
            message,
            HttpStatus.CREATED.value(),
            results
        );
    }
}

