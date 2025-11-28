package com.rapidphotoflow.photos.mapper;

import com.rapidphotoflow.photos.api.dto.PhotoRegisterRequest;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import org.springframework.stereotype.Component;

@Component
public class PhotoMapper {
    
    public PhotoResponse toResponse(Photo photo) {
        if (photo == null) {
            return null;
        }
        
        return PhotoResponse.builder()
            .id(photo.getId())
            .cloudinaryPublicId(photo.getCloudinaryPublicId())
            .cloudinaryUrl(photo.getCloudinaryUrl())
            .originalFileName(photo.getOriginalFileName())
            .sizeBytes(photo.getSizeBytes())
            .contentType(photo.getContentType())
            .status(photo.getStatus())
            .thumbnailUrl(photo.getThumbnailUrl())
            .processedAt(photo.getProcessedAt())
            .errorMessage(photo.getErrorMessage())
            .createdAt(photo.getCreatedAt())
            .updatedAt(photo.getUpdatedAt())
            .build();
    }
    
    public Photo toEntity(PhotoRegisterRequest request) {
        if (request == null) {
            return null;
        }
        
        return Photo.builder()
            .cloudinaryPublicId(request.getCloudinaryPublicId())
            .cloudinaryUrl(request.getCloudinaryUrl())
            .originalFileName(request.getOriginalFileName())
            .sizeBytes(request.getSizeBytes())
            .contentType(request.getContentType())
            .status(PhotoStatus.UPLOADED)
            .build();
    }
}
