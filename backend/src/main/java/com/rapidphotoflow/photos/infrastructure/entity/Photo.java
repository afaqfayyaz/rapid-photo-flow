package com.rapidphotoflow.photos.infrastructure.entity;

import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "photos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Photo {
    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    
    private String cloudinaryPublicId;
    
    private String cloudinaryUrl;
    
    private String originalFileName;
    
    private Long sizeBytes;
    
    private String contentType;
    
    @Builder.Default
    private PhotoStatus status = PhotoStatus.UPLOADED;
    
    private String thumbnailUrl;
    
    private LocalDateTime processedAt;
    
    private String errorMessage;
    
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    public void updateStatus(PhotoStatus newStatus, String errorMessage) {
        this.status = newStatus;
        if (newStatus == PhotoStatus.COMPLETED) {
            this.processedAt = LocalDateTime.now();
        }
        this.errorMessage = errorMessage;
        this.updatedAt = LocalDateTime.now();
    }
}
