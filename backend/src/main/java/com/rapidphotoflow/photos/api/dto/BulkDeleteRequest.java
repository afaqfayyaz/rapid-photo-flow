package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.Data;

import java.util.List;

@Data
public class BulkDeleteRequest {
    private List<String> photoIds; // Explicit list of photo IDs to delete
    
    // Mode-based deletion
    private DeleteMode mode; // ALL, ALL_COMPLETED, ALL_REVIEWED, etc.
    private List<PhotoStatus> statusFilter; // Optional status filter for mode-based deletion
    
    public enum DeleteMode {
        EXPLICIT, // Use photoIds list
        ALL, // Delete all photos (optionally filtered by statusFilter)
        ALL_COMPLETED, // Delete all COMPLETED photos
        ALL_REVIEWED // Delete all REVIEWED photos
    }
    
    public void validate() {
        if (mode == null) {
            mode = DeleteMode.EXPLICIT;
        }
        
        if (mode == DeleteMode.EXPLICIT && (photoIds == null || photoIds.isEmpty())) {
            throw new IllegalArgumentException("photoIds must be provided when mode is EXPLICIT");
        }
        
        if (mode != DeleteMode.EXPLICIT && photoIds != null && !photoIds.isEmpty()) {
            throw new IllegalArgumentException("photoIds should not be provided when using mode-based deletion");
        }
    }
}
