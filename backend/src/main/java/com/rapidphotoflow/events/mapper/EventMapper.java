package com.rapidphotoflow.events.mapper;

import com.rapidphotoflow.events.api.dto.EventResponse;
import com.rapidphotoflow.events.infrastructure.entity.PhotoEvent;
import org.springframework.stereotype.Component;

@Component
public class EventMapper {
    
    public EventResponse toResponse(PhotoEvent event) {
        if (event == null) {
            return null;
        }
        
        return EventResponse.builder()
            .id(event.getId())
            .photoId(event.getPhotoId())
            .eventType(event.getEventType())
            .message(event.getMessage())
            .timestamp(event.getTimestamp())
            .createdAt(event.getCreatedAt())
            .build();
    }
}

