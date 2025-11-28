package com.rapidphotoflow.photos.domain;

public enum PhotoStatus {
    UPLOADED,      // Initial state after upload
    PROCESSING,    // Being processed
    COMPLETED,     // Processing done
    REVIEWED,      // User reviewed
    FAILED         // Processing failed
}

