package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.common.exceptions.ValidationException;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.Data;

import java.util.List;

@Data
public class BulkStatusUpdateRequest {
    private List<String> photoIds;
    private PhotoStatus status;
    private String errorMessage;
    
    public void validate() {
        if (photoIds == null || photoIds.isEmpty()) {
            throw new ValidationException("photoIds is required and cannot be empty");
        }
        if (status == null) {
            throw new ValidationException("status is required");
        }
    }
}
