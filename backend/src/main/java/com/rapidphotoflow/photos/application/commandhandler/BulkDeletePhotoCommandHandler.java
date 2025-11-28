package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.BulkDeleteRequest;
import com.rapidphotoflow.photos.api.dto.BulkDeleteResponse;
import com.rapidphotoflow.photos.application.integration.CloudinaryService;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BulkDeletePhotoCommandHandler {
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final CloudinaryService cloudinaryService;
    
    public ApiResponse<BulkDeleteResponse> handle(BulkDeleteRequest request) throws IOException {
        List<Photo> photosToDelete = selectPhotosToDelete(request);
        
        if (photosToDelete.isEmpty()) {
            return new ApiResponse<>(
                true,
                "No photos found to delete",
                HttpStatus.OK.value(),
                BulkDeleteResponse.builder()
                    .requestedCount(0)
                    .deletedCount(0)
                    .cloudinaryFailedCount(0)
                    .cloudinaryFailed(List.of())
                    .build()
            );
        }
        
        // Delete from Cloudinary
        List<String> cloudinaryPublicIds = photosToDelete.stream()
            .map(Photo::getCloudinaryPublicId)
            .filter(id -> id != null && !id.isEmpty())
            .collect(Collectors.toList());
        
        Map<String, Boolean> cloudinaryResults = cloudinaryService.deleteFilesBulk(cloudinaryPublicIds);
        
        // Separate successful and failed deletions
        List<Photo> photosToDeleteFromDb = new ArrayList<>();
        List<BulkDeleteResponse.FailedDeletion> failedDeletions = new ArrayList<>();
        
        for (Photo photo : photosToDelete) {
            String publicId = photo.getCloudinaryPublicId();
            if (publicId == null || publicId.isEmpty() || 
                (cloudinaryResults.containsKey(publicId) && cloudinaryResults.get(publicId))) {
                photosToDeleteFromDb.add(photo);
                } else {
                    failedDeletions.add(BulkDeleteResponse.FailedDeletion.builder()
                        .photoId(photo.getId())
                        .cloudinaryPublicId(publicId)
                        .error("Cloudinary deletion failed")
                        .build());
                }
            }
        
        // Delete from database and publish events
        if (!photosToDeleteFromDb.isEmpty()) {
            photoRepository.deleteAll(photosToDeleteFromDb);
            photosToDeleteFromDb.forEach(photo ->
                eventPublisher.publish(
                    photo.getId(),
                    EventType.PHOTO_DELETED,
                    "Photo deleted: " + photo.getOriginalFileName()
                )
            );
        }
        
        BulkDeleteResponse responseData = BulkDeleteResponse.builder()
            .requestedCount(photosToDelete.size())
            .deletedCount(photosToDeleteFromDb.size())
            .cloudinaryFailedCount(failedDeletions.size())
            .cloudinaryFailed(failedDeletions)
            .build();
        
        String message = String.format("Processed %d photos", photosToDelete.size());
        
        return new ApiResponse<>(
            true,
            message,
            HttpStatus.OK.value(),
            responseData
        );
    }
    
    private List<Photo> selectPhotosToDelete(BulkDeleteRequest request) {
        if (request.getMode() == BulkDeleteRequest.DeleteMode.EXPLICIT) {
            if (request.getPhotoIds() == null || request.getPhotoIds().isEmpty()) {
                return List.of();
            }
            return photoRepository.findByIdIn(request.getPhotoIds());
        }
        
        List<PhotoStatus> statusesToDelete = determineStatuses(request);
        if (statusesToDelete.isEmpty()) {
            return List.of();
        }
        return photoRepository.findByStatusIn(statusesToDelete);
    }
    
    private List<PhotoStatus> determineStatuses(BulkDeleteRequest request) {
        return switch (request.getMode()) {
            case ALL_COMPLETED -> List.of(PhotoStatus.COMPLETED);
            case ALL_REVIEWED -> List.of(PhotoStatus.REVIEWED);
            case ALL -> {
                if (request.getStatusFilter() != null && !request.getStatusFilter().isEmpty()) {
                    yield request.getStatusFilter();
                }
                yield List.of(
                    PhotoStatus.UPLOADED,
                    PhotoStatus.PROCESSING,
                    PhotoStatus.COMPLETED,
                    PhotoStatus.REVIEWED
                );
            }
            default -> List.of();
        };
    }
}
