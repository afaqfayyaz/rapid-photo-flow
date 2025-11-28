package com.rapidphotoflow.photos.infrastructure.queue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class InMemoryPhotoQueueTest {
    
    private InMemoryPhotoQueue queue;
    
    @BeforeEach
    void setUp() {
        queue = new InMemoryPhotoQueue();
    }
    
    @Test
    void shouldStartWithZeroSize() {
        assertEquals(0, queue.size());
    }
    
    @Test
    void shouldEnqueuePhotoId() {
        queue.enqueue("photo-1");
        assertEquals(1, queue.size());
    }
    
    @Test
    void shouldEnqueueMultiplePhotoIds() {
        queue.enqueue("photo-1");
        queue.enqueue("photo-2");
        queue.enqueue("photo-3");
        assertEquals(3, queue.size());
    }
    
    @Test
    void shouldTakePhotoIdFromQueue() throws InterruptedException {
        queue.enqueue("photo-1");
        String photoId = queue.take();
        
        assertEquals("photo-1", photoId);
        assertEquals(0, queue.size());
    }
    
    @Test
    void shouldTakePhotosInFIFOOrder() throws InterruptedException {
        queue.enqueue("photo-1");
        queue.enqueue("photo-2");
        queue.enqueue("photo-3");
        
        assertEquals("photo-1", queue.take());
        assertEquals("photo-2", queue.take());
        assertEquals("photo-3", queue.take());
        assertEquals(0, queue.size());
    }
    
    @Test
    void shouldBlockWhenTakingFromEmptyQueue() throws InterruptedException {
        Thread thread = new Thread(() -> {
            try {
                String photoId = queue.take();
                assertEquals("photo-2", photoId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        
        thread.start();
        Thread.sleep(100); // Give thread time to block
        
        queue.enqueue("photo-2");
        thread.join(1000); // Wait for thread to complete
        
        assertFalse(thread.isAlive());
    }
}

