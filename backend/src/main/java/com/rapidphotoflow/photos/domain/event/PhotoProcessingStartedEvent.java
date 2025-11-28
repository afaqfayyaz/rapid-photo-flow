package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;

/**
 * Domain event published when photo processing starts.
 */
public class PhotoProcessingStartedEvent extends PhotoDomainEvent {
    
    public PhotoProcessingStartedEvent(Object source, String photoId) {
        super(source, photoId, EventType.PHOTO_PROCESSING_STARTED, 
            "Photo processing started");
    }
}

