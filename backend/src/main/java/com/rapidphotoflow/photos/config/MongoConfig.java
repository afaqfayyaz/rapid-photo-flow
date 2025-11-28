package com.rapidphotoflow.photos.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.MongoTemplate;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class MongoConfig {
    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void createIndexes() {
        try {
            IndexOperations indexOps = mongoTemplate.indexOps("photos");
            
            // Create unique index on cloudinaryPublicId for idempotency
            Index cloudinaryPublicIdIndex = new Index().on("cloudinaryPublicId", org.springframework.data.domain.Sort.Direction.ASC).unique();
            indexOps.ensureIndex(cloudinaryPublicIdIndex);
            
            log.info("Created unique index on cloudinaryPublicId");
        } catch (Exception e) {
            log.warn("Failed to create indexes (may already exist): {}", e.getMessage());
        }
    }
}

