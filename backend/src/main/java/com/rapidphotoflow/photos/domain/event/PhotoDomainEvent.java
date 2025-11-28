package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Base class for photo domain events.
 * 
 * <p>Domain events represent something meaningful that happened in the domain.
 * They are published using Spring's ApplicationEvent mechanism and can be
 * listened to by various components (persistence, logging, etc.).
 */
@Getter
public abstract class PhotoDomainEvent extends ApplicationEvent {
    
    private final String photoId;
    private final EventType eventType;
    private final String message;
    
    protected PhotoDomainEvent(Object source, String photoId, EventType eventType, String message) {
        super(source);
        this.photoId = photoId;
        this.eventType = eventType;
        this.message = message;
    }
}

