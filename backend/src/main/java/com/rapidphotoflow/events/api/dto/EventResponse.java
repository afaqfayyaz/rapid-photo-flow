package com.rapidphotoflow.events.api.dto;

import com.rapidphotoflow.events.domain.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private String id;
    private String photoId;
    private EventType eventType;
    private String message;
    private LocalDateTime timestamp;
    private LocalDateTime createdAt;
}

