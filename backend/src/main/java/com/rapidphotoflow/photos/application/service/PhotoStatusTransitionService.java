package com.rapidphotoflow.photos.application.service;

import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import org.springframework.stereotype.Service;

import java.util.Set;

/**
 * Service responsible for validating photo status transitions.
 * Ensures only valid state changes are allowed in the photo processing workflow.
 */
@Service
public class PhotoStatusTransitionService {
    
    /**
     * Validates if a transition from the current status to the new status is allowed.
     * 
     * @param currentStatus the current photo status
     * @param newStatus the desired new status
     * @throws ValidationException if the transition is invalid
     */
    public void validateTransition(PhotoStatus currentStatus, PhotoStatus newStatus) {
        if (currentStatus == newStatus) {
            return; // No-op transition is allowed
        }
        
        Set<PhotoStatus> allowedTransitions = getAllowedTransitions(currentStatus);
        
        if (!allowedTransitions.contains(newStatus)) {
            throw new ValidationException(
                String.format("Invalid status transition from %s to %s", currentStatus, newStatus)
            );
        }
    }
    
    private Set<PhotoStatus> getAllowedTransitions(PhotoStatus currentStatus) {
        return switch (currentStatus) {
            case UPLOADED -> Set.of(PhotoStatus.PROCESSING, PhotoStatus.FAILED);
            case PROCESSING -> Set.of(PhotoStatus.COMPLETED, PhotoStatus.FAILED);
            case COMPLETED -> Set.of(PhotoStatus.REVIEWED);
            case REVIEWED -> Set.of(); // Terminal state
            case FAILED -> Set.of(PhotoStatus.UPLOADED); // Allow retry
        };
    }
}

