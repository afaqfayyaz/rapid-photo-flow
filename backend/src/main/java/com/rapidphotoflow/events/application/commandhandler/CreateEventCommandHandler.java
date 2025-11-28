package com.rapidphotoflow.events.application.commandhandler;

import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.events.infrastructure.entity.PhotoEvent;
import com.rapidphotoflow.events.infrastructure.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CreateEventCommandHandler {
    private final EventRepository eventRepository;
    
    public void handle(String photoId, EventType eventType, String message) {
        PhotoEvent event = PhotoEvent.builder()
            .photoId(photoId)
            .eventType(eventType)
            .message(message)
            .build();
        
        eventRepository.save(event);
        log.debug("Event created: photoId={}, eventType={}", photoId, eventType);
    }
}

