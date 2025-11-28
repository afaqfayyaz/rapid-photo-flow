package com.rapidphotoflow.photos.infrastructure.queue;

import com.rapidphotoflow.photos.domain.PhotoQueue;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * In-memory implementation of PhotoQueue using a BlockingQueue.
 * Thread-safe and suitable for a single-instance application.
 */
@Component
public class InMemoryPhotoQueue implements PhotoQueue {
    
    private final BlockingQueue<String> queue = new LinkedBlockingQueue<>();
    
    @Override
    public void enqueue(String photoId) {
        queue.offer(photoId);
    }
    
    @Override
    public String take() throws InterruptedException {
        return queue.take();
    }
    
    @Override
    public int size() {
        return queue.size();
    }
}

