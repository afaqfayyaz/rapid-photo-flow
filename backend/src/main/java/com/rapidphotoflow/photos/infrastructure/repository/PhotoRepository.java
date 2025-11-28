package com.rapidphotoflow.photos.infrastructure.repository;

import com.rapidphotoflow.photos.domain.PhotoStatus;
import com.rapidphotoflow.photos.infrastructure.entity.Photo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRepository extends MongoRepository<Photo, String> {
    Page<Photo> findByStatus(PhotoStatus status, Pageable pageable);
    
    List<Photo> findByStatus(PhotoStatus status);
    
    List<Photo> findByStatusIn(List<PhotoStatus> statuses);
    
    List<Photo> findByIdIn(List<String> ids);
    
    Optional<Photo> findByCloudinaryPublicId(String cloudinaryPublicId);
    
    List<Photo> findByCloudinaryPublicIdIn(List<String> cloudinaryPublicIds);
}
