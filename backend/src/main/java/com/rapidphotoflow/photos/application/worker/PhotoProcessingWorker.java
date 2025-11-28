package com.rapidphotoflow.photos.application.worker;

import com.rapidphotoflow.events.application.integration.EventPublisher;
import com.rapidphotoflow.events.domain.EventType;
import com.rapidphotoflow.photos.api.dto.PhotoStatusUpdateRequest;
import com.rapidphotoflow.photos.application.commandhandler.UpdatePhotoStatusCommandHandler;
import com.rapidphotoflow.photos.domain.PhotoQueue;
import com.rapidphotoflow.photos.domain.PhotoStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Random;

/**
 * Background worker that processes photos from the queue.
 * 
 * <p>This worker runs in a dedicated thread and continuously:
 * <ul>
 *   <li>Takes photos from the queue (blocking)</li>
 *   <li>Updates status to PROCESSING</li>
 *   <li>Simulates processing work with a delay</li>
 *   <li>Updates status to COMPLETED or FAILED based on simulated outcome</li>
 *   <li>Publishes appropriate domain events</li>
 * </ul>
 * 
 * <p>The worker never terminates and handles all exceptions gracefully,
 * ensuring the processing loop continues even if individual photos fail.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PhotoProcessingWorker {
    
    private final PhotoQueue photoQueue;
    private final UpdatePhotoStatusCommandHandler statusHandler;
    private final EventPublisher eventPublisher;
    private final Random random = new Random();
    
    private static final double SUCCESS_RATE = 0.9; // 90% success rate
    private static final int MIN_PROCESSING_TIME_MS = 1000;
    private static final int MAX_PROCESSING_TIME_MS = 3000;
    
    /**
     * Starts the worker thread when the application is ready.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void start() {
        Thread workerThread = new Thread(this::processLoop, "photo-processing-worker");
        workerThread.setDaemon(true);
        workerThread.start();
        log.info("Photo processing worker started");
    }
    
    /**
     * Main processing loop. Continuously takes photos from the queue and processes them.
     */
    private void processLoop() {
        while (true) {
            try {
                String photoId = photoQueue.take();
                log.debug("Processing photo from queue: photoId={}", photoId);
                processPhoto(photoId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Photo processing worker interrupted, shutting down");
                break;
            } catch (Exception e) {
                log.error("Unexpected error in photo processing worker, continuing", e);
            }
        }
    }
    
    /**
     * Processes a single photo through the complete workflow.
     * 
     * @param photoId the photo to process
     */
    private void processPhoto(String photoId) {
        try {
            // Mark as processing
            updateStatus(photoId, PhotoStatus.PROCESSING, null);
            eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_STARTED, 
                "Photo processing started");
            
            // Simulate processing work
            simulateProcessing();
            
            // Determine outcome
            if (random.nextDouble() < SUCCESS_RATE) {
                completePhoto(photoId);
            } else {
                failPhoto(photoId);
            }
        } catch (Exception e) {
            log.error("Failed to process photo: photoId={}", photoId, e);
            try {
                failPhoto(photoId, "Processing failed: " + e.getMessage());
            } catch (Exception ex) {
                log.error("Failed to mark photo as failed: photoId={}", photoId, ex);
            }
        }
    }
    
    /**
     * Simulates processing work with a random delay.
     */
    private void simulateProcessing() throws InterruptedException {
        int delay = MIN_PROCESSING_TIME_MS + 
                   random.nextInt(MAX_PROCESSING_TIME_MS - MIN_PROCESSING_TIME_MS);
        Thread.sleep(delay);
    }
    
    /**
     * Marks a photo as successfully completed.
     */
    private void completePhoto(String photoId) {
        updateStatus(photoId, PhotoStatus.COMPLETED, null);
        eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_COMPLETED, 
            "Photo processing completed successfully");
        log.info("Photo processing completed: photoId={}", photoId);
    }
    
    /**
     * Marks a photo as failed with a default error message.
     */
    private void failPhoto(String photoId) {
        failPhoto(photoId, "Processing failed: Simulated error");
    }
    
    /**
     * Marks a photo as failed with a specific error message.
     */
    private void failPhoto(String photoId, String errorMessage) {
        updateStatus(photoId, PhotoStatus.FAILED, errorMessage);
        eventPublisher.publish(photoId, EventType.PHOTO_PROCESSING_FAILED, errorMessage);
        log.warn("Photo processing failed: photoId={}, error={}", photoId, errorMessage);
    }
    
    /**
     * Updates the photo status via the command handler.
     */
    private void updateStatus(String photoId, PhotoStatus status, String errorMessage) {
        PhotoStatusUpdateRequest request = new PhotoStatusUpdateRequest();
        request.setStatus(status);
        request.setErrorMessage(errorMessage);
        statusHandler.handle(photoId, request);
    }
}

