package com.rapidphotoflow.photos.domain;

/**
 * Queue abstraction for photo processing.
 * Provides a simple interface for enqueueing photos and taking them for processing.
 */
public interface PhotoQueue {
    
    /**
     * Enqueues a photo ID for processing.
     * 
     * @param photoId the photo ID to enqueue
     */
    void enqueue(String photoId);
    
    /**
     * Takes a photo ID from the queue, blocking until one is available.
     * 
     * @return the photo ID to process
     * @throws InterruptedException if the thread is interrupted while waiting
     */
    String take() throws InterruptedException;
    
    /**
     * Returns the current size of the queue.
     * 
     * @return the number of photos waiting in the queue
     */
    int size();
}

