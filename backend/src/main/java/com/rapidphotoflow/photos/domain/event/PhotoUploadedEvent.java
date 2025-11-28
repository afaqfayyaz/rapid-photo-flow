package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;

/**
 * Domain event published when a photo is uploaded.
 */
public class PhotoUploadedEvent extends PhotoDomainEvent {
    
    public PhotoUploadedEvent(Object source, String photoId, String fileName) {
        super(source, photoId, EventType.PHOTO_UPLOADED, 
            "Photo uploaded: " + fileName);
    }
}

