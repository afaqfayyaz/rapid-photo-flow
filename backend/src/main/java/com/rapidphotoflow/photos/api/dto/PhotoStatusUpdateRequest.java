package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.Data;

@Data
public class PhotoStatusUpdateRequest {
    private PhotoStatus status;
    private String errorMessage;
    
    public void validate() {
        if (status == null) {
            throw new ValidationException("status is required");
        }
    }
}

