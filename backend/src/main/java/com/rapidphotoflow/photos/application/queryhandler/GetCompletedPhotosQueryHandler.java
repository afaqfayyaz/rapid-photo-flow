package com.rapidphotoflow.photos.application.queryhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.photos.api.dto.PhotoResponse;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.repository.PhotoRepository;
import com.rapidphotoflow.photos.mapper.PhotoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GetCompletedPhotosQueryHandler {
    private final PhotoMapper photoMapper;
    private final PhotoRepository photoRepository;
    
    public ApiResponse<List<PhotoResponse>> handle() {
        List<PhotoResponse> response = photoRepository.findByStatus(PhotoStatus.COMPLETED).stream()
            .map(photoMapper::toResponse)
            .collect(Collectors.toList());
        
        return new ApiResponse<>(
            true,
            "Completed photos fetched successfully",
            HttpStatus.OK.value(),
            response
        );
    }
}

