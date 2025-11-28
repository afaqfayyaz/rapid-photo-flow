package com.rapidphotoflow.photos.domain.event;

import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.domain.PhotoStatus;

/**
 * Domain event published when a photo's status changes.
 */
public class PhotoStatusChangedEvent extends PhotoDomainEvent {
    
    private final PhotoStatus newStatus;
    
    public PhotoStatusChangedEvent(Object source, String photoId, PhotoStatus newStatus, String errorMessage) {
        super(source, photoId, EventType.PHOTO_STATUS_CHANGED, 
            buildMessage(newStatus, errorMessage));
        this.newStatus = newStatus;
    }
    
    public PhotoStatus getNewStatus() {
        return newStatus;
    }
    
    private static String buildMessage(PhotoStatus status, String errorMessage) {
        String message = "Photo status updated to " + status;
        if (errorMessage != null && !errorMessage.isEmpty()) {
            message += ": " + errorMessage;
        }
        return message;
    }
}

