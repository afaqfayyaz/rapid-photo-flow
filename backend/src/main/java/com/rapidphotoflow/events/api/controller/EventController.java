package com.rapidphotoflow.events.api.controller;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.events.api.dto.EventResponse;
import com.rapidphotoflow.events.application.queryhandler.GetEventsQueryHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/events")
public class EventController {
    private final GetEventsQueryHandler getEventsHandler;
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<EventResponse>>> getEvents(
            @RequestParam(required = false) String photoId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(getEventsHandler.handle(photoId, page, size));
    }
}

