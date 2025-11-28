package com.rapidphotoflow.photos.api.dto;

import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PhotoResponse {
    private String id;
    private String cloudinaryPublicId;
    private String cloudinaryUrl;
    private String originalFileName;
    private Long sizeBytes;
    private String contentType;
    private PhotoStatus status;
    private String thumbnailUrl;
    private LocalDateTime processedAt;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
