package com.rapidphotoflow.photos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkDeleteResponse {
    private int requestedCount;
    private int deletedCount;
    private int cloudinaryFailedCount;
    private List<FailedDeletion> cloudinaryFailed;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedDeletion {
        private String photoId;
        private String cloudinaryPublicId;
        private String error;
    }
}

