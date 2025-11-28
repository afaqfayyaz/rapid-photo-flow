package com.rapidphotoflow.photos.api.controller;

import com.rapidphotoflow.common.querydto.ApiResponse;
import com.rapidphotoflow.photos.api.dto.*;
import com.rapidphotoflow.photos.application.commandhandler.*;
import com.rapidphotoflow.photos.application.queryhandler.*;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/photos")
public class PhotoController {
    private final RegisterPhotoCommandHandler registerHandler;
    private final BulkRegisterPhotosCommandHandler bulkRegisterHandler;
    private final GetPhotoQueryHandler getHandler;
    private final GetAllPhotosQueryHandler getAllHandler;
    private final GetCompletedPhotosQueryHandler getCompletedHandler;
    private final UpdatePhotoStatusCommandHandler updateStatusHandler;
    private final BulkUpdatePhotoStatusCommandHandler bulkUpdateStatusHandler;
    private final DeletePhotoCommandHandler deleteHandler;
    private final BulkDeletePhotoCommandHandler bulkDeleteHandler;
    
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<PhotoResponse>> registerPhoto(@RequestBody PhotoRegisterRequest request) {
        request.validate();
        ApiResponse<PhotoResponse> response = registerHandler.handle(request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }
    
    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<BulkRegistrationItemResult>>> bulkRegisterPhotos(
            @RequestBody BulkPhotoRegisterRequest request) {
        request.validate();
        ApiResponse<List<BulkRegistrationItemResult>> response = bulkRegisterHandler.handle(request);
        return ResponseEntity.status(response.getStatusCode()).body(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PhotoResponse>> getPhoto(@PathVariable String id) {
        return ResponseEntity.ok(getHandler.handle(id));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoResponse>>> getAllPhotos(
            @RequestParam(required = false) PhotoStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(getAllHandler.handle(status, page, size));
    }
    
    @GetMapping("/completed")
    public ResponseEntity<ApiResponse<List<PhotoResponse>>> getCompletedPhotos() {
        return ResponseEntity.ok(getCompletedHandler.handle());
    }
    
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable String id,
            @RequestBody PhotoStatusUpdateRequest request) {
        request.validate();
        return ResponseEntity.ok(updateStatusHandler.handle(id, request));
    }
    
    @PatchMapping("/bulk/status")
    public ResponseEntity<ApiResponse<Void>> bulkUpdateStatus(
            @RequestBody BulkStatusUpdateRequest request) {
        request.validate();
        return ResponseEntity.ok(bulkUpdateStatusHandler.handle(request));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePhoto(@PathVariable String id) throws IOException {
        return ResponseEntity.ok(deleteHandler.handle(id));
    }
    
    @DeleteMapping("/bulk")
    public ResponseEntity<ApiResponse<BulkDeleteResponse>> bulkDeletePhotos(
            @RequestBody BulkDeleteRequest request) throws IOException {
        request.validate();
        return ResponseEntity.ok(bulkDeleteHandler.handle(request));
    }
}
