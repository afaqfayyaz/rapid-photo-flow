package com.rapidphotoflow.photos.application.queryhandler;

import com.rapidphotoflow.common.exceptions.NotFoundException;
import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import com.rapidphotoflow.photos.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GetPhotoQueryHandler {
    private final PhotoMapper photoMapper;
    private final PhotoRepository photoRepository;
    
    public ApiResponse<PhotoResponse> handle(String photoId) {
        Photo photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new NotFoundException("Photo not found: " + photoId));
        
        return new ApiResponse<>(
            true,
            "Photo fetched successfully",
            HttpStatus.OK.value(),
            photoMapper.toResponse(photo)
        );
    }
}
