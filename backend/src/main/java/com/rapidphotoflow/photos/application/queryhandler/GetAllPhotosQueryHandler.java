package com.rapidphotoflow.photos.application.queryhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import com.rapidphotoflow.photos.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetAllPhotosQueryHandler {
    private final PhotoMapper photoMapper;
    private final PhotoRepository photoRepository;
    
    public ApiResponse<List<PhotoResponse>> handle(PhotoStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Photo> photos = status != null 
            ? photoRepository.findByStatus(status, pageable)
            : photoRepository.findAll(pageable);
        
        List<PhotoResponse> response = photos.getContent().stream()
            .map(photoMapper::toResponse)
            .collect(Collectors.toList());
        
        return new ApiResponse<>(
            true,
            "Photos fetched successfully",
            HttpStatus.OK.value(),
            response
        );
    }
}
