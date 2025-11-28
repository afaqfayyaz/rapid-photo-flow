package com.rapidphotoflow.events.infrastructure.listener;

import com.rapidphotoflow.events.application.commandhandler.CreateEventCommandHandler;
import com.rapidphotoflow.photos.domain.event.PhotoDomainEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Event listener that persists photo domain events to the database.
 * 
 * <p>This listener ensures all domain events are captured in the event log
 * for workflow history and auditing purposes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PhotoEventPersistenceListener {
    
    private final CreateEventCommandHandler eventHandler;
    
    /**
     * Listens for photo domain events and persists them.
     * 
     * @param event the domain event to persist
     */
    @Async
    @EventListener
    public void handlePhotoDomainEvent(PhotoDomainEvent event) {
        log.debug("Persisting domain event: photoId={}, eventType={}", 
            event.getPhotoId(), event.getEventType());
        
        eventHandler.handle(
            event.getPhotoId(),
            event.getEventType(),
            event.getMessage()
        );
    }
}

