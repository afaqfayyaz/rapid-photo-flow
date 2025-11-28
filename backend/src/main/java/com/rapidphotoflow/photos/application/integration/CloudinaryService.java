package com.rapidphotoflow.photos.application.integration;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private final Cloudinary cloudinary;
    private static final int BATCH_SIZE = 30; // Cloudinary bulk delete batch size
    
    public Map<String, Object> deleteFile(String publicId) throws IOException {
        log.debug("Deleting file from Cloudinary: publicId={}", publicId);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
        
        String resultStatus = (String) result.get("result");
        if (!"ok".equals(resultStatus)) {
            log.warn("Cloudinary delete returned non-ok status: publicId={}, result={}", publicId, result);
        } else {
            log.info("File deleted from Cloudinary: publicId={}", publicId);
        }
        
        return result;
    }
    
    /**
     * Bulk delete files from Cloudinary in batches
     * @param publicIds List of Cloudinary public IDs to delete
     * @return Map of publicId -> deletion result (true = success, false = failure)
     */
    public Map<String, Boolean> deleteFilesBulk(List<String> publicIds) throws IOException {
        log.debug("Bulk deleting files from Cloudinary: count={}", publicIds.size());
        
        Map<String, Boolean> results = new HashMap<>();
        
        // Process in batches
        for (int i = 0; i < publicIds.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, publicIds.size());
            List<String> batch = publicIds.subList(i, end);
            
            log.debug("Processing Cloudinary delete batch: {}-{} of {}", i + 1, end, publicIds.size());
            
            try {
                // Cloudinary Admin API supports bulk deletion via deleteResources
                @SuppressWarnings("unchecked")
                Map<String, Object> result = cloudinary.api().deleteResources(
                    batch,
                    ObjectUtils.asMap("type", "upload")
                );
                
                @SuppressWarnings("unchecked")
                Map<String, String> deleted = (Map<String, String>) result.get("deleted");
                @SuppressWarnings("unchecked")
                Map<String, String> notFound = (Map<String, String>) result.get("not_found");
                
                // Mark successfully deleted
                if (deleted != null) {
                    deleted.keySet().forEach(publicId -> {
                        results.put(publicId, true);
                        log.debug("Cloudinary bulk delete succeeded: publicId={}", publicId);
                    });
                }
                
                // Mark not found as success (we just want them gone)
                if (notFound != null) {
                    notFound.keySet().forEach(publicId -> {
                        results.put(publicId, true);
                        log.debug("Cloudinary asset not found (treating as success): publicId={}", publicId);
                    });
                }
                
                // Check for any failures
                for (String publicId : batch) {
                    if (!results.containsKey(publicId)) {
                        // Not in deleted or not_found, treat as failure
                        results.put(publicId, false);
                        log.warn("Cloudinary bulk delete failed: publicId={}", publicId);
                    }
                }
                
            } catch (Exception e) {
                log.error("Error in Cloudinary bulk delete batch: {}", e.getMessage(), e);
                // Mark all in batch as failed
                batch.forEach(publicId -> results.put(publicId, false));
            }
        }
        
        int successCount = (int) results.values().stream().filter(Boolean::booleanValue).count();
        log.info("Cloudinary bulk delete completed: {}/{} succeeded", successCount, publicIds.size());
        
        return results;
    }
}

