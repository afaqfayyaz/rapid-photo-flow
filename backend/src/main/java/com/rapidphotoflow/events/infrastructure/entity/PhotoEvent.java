package com.rapidphotoflow.events.infrastructure.entity;

import com.rapidphotoflow.events.domain.EventType;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;

@Document(collection = "photo_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoEvent {
    @Id
    @Builder.Default
    private String id = UUID.randomUUID().toString();
    
    private String photoId;
    
    private EventType eventType;
    
    private String message;
    
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
