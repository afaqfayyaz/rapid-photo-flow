package com.rapidphotoflow.photos.application.commandhandler;

import com.rapidphotoflow.common.exceptions.NotFoundException;
import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.application.integration.CloudinaryService;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeletePhotoCommandHandler {
    private final EventPublisher eventPublisher;
    private final PhotoRepository photoRepository;
    private final CloudinaryService cloudinaryService;
    
    public ApiResponse<Void> handle(String photoId) throws IOException {
        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new NotFoundException("Photo not found: " + photoId));
        
        try {
            cloudinaryService.deleteFile(photo.getCloudinaryPublicId());
        } catch (Exception e) {
            log.warn("Failed to delete file from Cloudinary: publicId={}", photo.getCloudinaryPublicId(), e);
        }
        
        photoRepository.delete(photo);
        eventPublisher.publish(
            photoId,
            EventType.PHOTO_DELETED,
            "Photo deleted: " + photo.getOriginalFileName()
        );
        
        return new ApiResponse<>(
            true,
            "Photo deleted successfully",
            HttpStatus.OK.value(),
            null
        );
    }
}
