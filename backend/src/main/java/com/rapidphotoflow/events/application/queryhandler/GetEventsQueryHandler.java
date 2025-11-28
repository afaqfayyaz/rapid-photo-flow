package com.rapidphotoflow.events.application.queryhandler;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.api.dto.EventResponse;
import com.rapidphotoflow.events.infrastructure.entity.PhotoEvent;
import com.rapidphotoflow.events.infrastructure.repository.EventRepository;
import com.rapidphotoflow.events.mapper.EventMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GetEventsQueryHandler {
    private final EventRepository eventRepository;
    private final EventMapper eventMapper;
    
    public ApiResponse<List<EventResponse>> handle(String photoId, int page, int size) {
        log.debug("Fetching events: photoId={}, page={}, size={}", photoId, page, size);
        
        List<EventResponse> response;
        
        if (photoId != null) {
            List<PhotoEvent> events = eventRepository.findByPhotoIdOrderByTimestampDesc(photoId);
            response = events.stream()
                .map(eventMapper::toResponse)
                .collect(Collectors.toList());
        } else {
            Pageable pageable = PageRequest.of(page, size);
            Page<PhotoEvent> eventsPage = eventRepository.findAllByOrderByTimestampDesc(pageable);
            response = eventsPage.getContent().stream()
                .map(eventMapper::toResponse)
                .collect(Collectors.toList());
        }
        
        log.debug("Events fetched successfully: count={}", response.size());
        
        return new ApiResponse<>(
            true,
            "Events fetched successfully",
            HttpStatus.OK.value(),
            response
        );
    }
}

