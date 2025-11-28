package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.common.exceptions.ValidationException;
import lombok.Data;

import java.util.List;

@Data
public class BulkPhotoRegisterRequest {
    private List<PhotoRegisterRequest> photos;
    
    public void validate() {
        if (photos == null || photos.isEmpty()) {
            throw new ValidationException("photos list is required and cannot be empty");
        }
        if (photos.size() > 100) {
            throw new ValidationException("Cannot register more than 100 photos at once");
        }
        // Note: Per-photo validation is done individually in the handler
        // to allow partial success when some photos are invalid
    }
}

