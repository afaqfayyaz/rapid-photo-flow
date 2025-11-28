package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;

/**
 * Domain event published when photo processing completes successfully.
 */
public class PhotoProcessingCompletedEvent extends PhotoDomainEvent {
    
    public PhotoProcessingCompletedEvent(Object source, String photoId) {
        super(source, photoId, EventType.PHOTO_PROCESSING_COMPLETED, 
            "Photo processing completed successfully");
    }
}

