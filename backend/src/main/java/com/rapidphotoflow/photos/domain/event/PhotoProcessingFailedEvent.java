package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;

/**
 * Domain event published when photo processing fails.
 */
public class PhotoProcessingFailedEvent extends PhotoDomainEvent {
    
    public PhotoProcessingFailedEvent(Object source, String photoId, String errorMessage) {
        super(source, photoId, EventType.PHOTO_PROCESSING_FAILED, 
            "Photo processing failed: " + errorMessage);
    }
}

