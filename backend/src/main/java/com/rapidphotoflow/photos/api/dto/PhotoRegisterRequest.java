package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.common.exceptions.ValidationException;
import lombok.Data;
import org.springframework.util.StringUtils;

@Data
public class PhotoRegisterRequest {
    private String cloudinaryPublicId;
    private String cloudinaryUrl;
    private String originalFileName;
    private Long sizeBytes;
    private String contentType;
    
    public void validate() {
        if (!StringUtils.hasText(cloudinaryPublicId)) {
            throw new ValidationException("cloudinaryPublicId is required");
        }
        if (!StringUtils.hasText(cloudinaryUrl)) {
            throw new ValidationException("cloudinaryUrl is required");
        }
        if (!StringUtils.hasText(originalFileName)) {
            throw new ValidationException("originalFileName is required");
        }
        if (sizeBytes == null || sizeBytes <= 0) {
            throw new ValidationException("sizeBytes must be positive");
        }
        if (!StringUtils.hasText(contentType)) {
            throw new ValidationException("contentType is required");
        }
    }
}

