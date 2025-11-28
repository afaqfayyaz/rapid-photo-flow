package com.rapidphotoflow.events.infrastructure.repository;

import com.rapidphotoflow.events.infrastructure.entity.PhotoEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends MongoRepository<PhotoEvent, String> {
    List<PhotoEvent> findByPhotoIdOrderByTimestampDesc(String photoId);
    
    Page<PhotoEvent> findByPhotoIdOrderByTimestampDesc(String photoId, Pageable pageable);
    
    Page<PhotoEvent> findAllByOrderByTimestampDesc(Pageable pageable);
}
