package com.rapidphotoflow.photos.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class BulkRegistrationItemResult {
    private String cloudinaryPublicId;
    private boolean success;
    private PhotoResponse photo; // null if success = false
    private String error; // null if success = true
}

