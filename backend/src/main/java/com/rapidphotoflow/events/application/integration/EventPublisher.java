package com.rapidphotoflow.events.application.integration;

import com.rapidphotoflow.events.application.commandhandler.CreateEventCommandHandler;
import com.rapidphotoflow.events.domain.EventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * Centralized event publisher for the application.
 * 
 * <p>Publishes events by persisting them to the database via CreateEventCommandHandler.
 * Events are stored in the event log for workflow history and can be queried via the /api/events endpoint.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EventPublisher {
    private final CreateEventCommandHandler eventHandler;
    
    /**
     * Publishes an event and persists it to the database.
     * 
     * @param photoId the photo ID associated with the event
     * @param eventType the type of event
     * @param message human-readable message describing the event
     */
    public void publish(String photoId, EventType eventType, String message) {
        log.debug("Publishing event: photoId={}, eventType={}, message={}", photoId, eventType, message);
        eventHandler.handle(photoId, eventType, message);
    }
}

