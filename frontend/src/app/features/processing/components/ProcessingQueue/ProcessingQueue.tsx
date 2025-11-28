import React, { useMemo } from 'react';
import { Photo } from '../../../models/photo.model';
import { StatusBadge } from '../../../../shared/components/StatusBadge/StatusBadge';
import { LoadingSpinner } from '../../../../shared/components/LoadingSpinner/LoadingSpinner';
import styles from './ProcessingQueue.module.css';

interface ProcessingQueueProps {
  photos: Photo[];
  loading: boolean;
  error: string | null;
}

const ProcessingQueueItem: React.FC<{ photo: Photo; index: number }> = ({ photo, index }) => {
  const uploadStatus = (photo as any).uploadStatus;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProgress = () => {
    // Handle upload statuses
    if (uploadStatus === 'QUEUED') return 10;
    if (uploadStatus === 'UPLOADING_TO_CLOUDINARY') return 30;
    if (uploadStatus === 'UPLOADED_TO_CLOUDINARY') return 50;
    if (uploadStatus === 'REGISTERING_METADATA') return 60;
    // Handle processing statuses
    if (photo.status === 'UPLOADED') return 30;
    if (photo.status === 'PROCESSING') return 70;
    if (photo.status === 'COMPLETED') return 100;
    return 0;
  };
  
  const getStatusText = () => {
    // Prioritize real-time active statuses (same priority as status badge)
    // Note: COMPLETED photos are filtered out, so they won't appear here
    if (uploadStatus === 'UPLOADING_TO_CLOUDINARY') return 'Uploading to Cloudinary...';
    if (uploadStatus === 'REGISTERING_METADATA') return 'Registering metadata...';
    if (photo.status === 'PROCESSING') return 'Processing...';
    
    // Waiting/queued statuses (lower priority)
    if (uploadStatus === 'QUEUED') return 'Queued for upload...';
    if (uploadStatus === 'UPLOADED_TO_CLOUDINARY') return 'Uploaded to Cloudinary, registering...';
    if (photo.status === 'UPLOADED') return 'Queued for processing...';
    
    return '';
  };
  
  const shouldShowProgress = () => {
    return uploadStatus === 'QUEUED' || 
           uploadStatus === 'UPLOADING_TO_CLOUDINARY' ||
           uploadStatus === 'UPLOADED_TO_CLOUDINARY' ||
           uploadStatus === 'REGISTERING_METADATA' ||
           photo.status === 'UPLOADED' || 
           photo.status === 'PROCESSING';
  };
  
  const getUploadStatusLabel = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'Queued';
      case 'UPLOADING_TO_CLOUDINARY':
        return 'Uploading';
      case 'UPLOADED_TO_CLOUDINARY':
        return 'Uploaded';
      case 'REGISTERING_METADATA':
        return 'Registering';
      default:
        return 'Uploaded';
    }
  };
  
  const getUploadStatusClass = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 'queued';
      case 'UPLOADING_TO_CLOUDINARY':
        return 'uploading';
      case 'UPLOADED_TO_CLOUDINARY':
        return 'uploaded';
      case 'REGISTERING_METADATA':
        return 'registering';
      default:
        return 'uploaded';
    }
  };
  
  // For photos still uploading without Cloudinary URL, show placeholder
  const thumbnailUrl = photo.cloudinaryUrl || photo.thumbnailUrl || photo.filePath || 
    `https://via.placeholder.com/120x120/6366f1/ffffff?text=${encodeURIComponent(photo.originalFileName.substring(0, 1).toUpperCase())}`;
  
  const fileSize = (photo.sizeBytes || photo.fileSize || 0) / 1024;

  const getStatusDataAttribute = () => {
    if (uploadStatus) {
      return getUploadStatusClass(uploadStatus);
    }
    return photo.status.toLowerCase();
  };

  return (
    <div 
      className={styles.queueItem}
      data-status={getStatusDataAttribute()}
      style={{ 
        animationDelay: `${index * 50}ms`
      }}
    >
      <div className={styles.thumbnailWrapper}>
        <img
          src={thumbnailUrl}
          alt={photo.originalFileName}
          className={styles.thumbnail}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://via.placeholder.com/120x120/6366f1/ffffff?text=${encodeURIComponent(photo.originalFileName.substring(0, 1).toUpperCase())}`;
          }}
        />
        {((uploadStatus === 'UPLOADING_TO_CLOUDINARY' ||
          uploadStatus === 'REGISTERING_METADATA' ||
          photo.status === 'PROCESSING')) && (
          <div className={styles.processingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </div>
      <div className={styles.content}>
        <h3 className={styles.fileName}>{photo.originalFileName}</h3>
        <div className={styles.meta}>
          <span>{fileSize.toFixed(2)} KB</span>
          <span>•</span>
          <span>{formatDate(photo.createdAt)}</span>
        </div>
        {shouldShowProgress() && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${getProgress()}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {getStatusText()}
            </span>
          </div>
        )}
      </div>
      <div className={styles.statusSection}>
        {(() => {
          // Prioritize real-time statuses over waiting states
          // Show uploadStatus if it's an active status, otherwise show photo.status
          if (uploadStatus && (
            uploadStatus === 'UPLOADING_TO_CLOUDINARY' || 
            uploadStatus === 'REGISTERING_METADATA' ||
            uploadStatus === 'QUEUED'
          )) {
            // Show active upload status
            return (
              <span 
                key={`${photo.id}-${uploadStatus}`}
                className={`${styles.badge} ${styles[getUploadStatusClass(uploadStatus)]}`}
              >
                {getUploadStatusLabel(uploadStatus)}
              </span>
            );
          } else if (photo.status === 'PROCESSING' || photo.status === 'COMPLETED') {
            // Show processing/completed status
            return <StatusBadge status={photo.status} />;
          } else if (uploadStatus === 'UPLOADED_TO_CLOUDINARY') {
            // Show "Uploaded" for photos uploaded to Cloudinary but not yet registered
            return (
              <span 
                key={`${photo.id}-${uploadStatus}`}
                className={`${styles.badge} ${styles[getUploadStatusClass(uploadStatus)]}`}
              >
                {getUploadStatusLabel(uploadStatus)}
              </span>
            );
          } else {
            // Fall back to photo.status (usually UPLOADED - lowest priority)
            return <StatusBadge status={photo.status} />;
          }
        })()}
      </div>
    </div>
  );
};

export const ProcessingQueue: React.FC<ProcessingQueueProps> = ({ photos, loading, error }) => {
  // Get status priority: higher number = higher priority (appears first)
  // Note: COMPLETED photos are filtered out, so they won't appear here
  const getStatusPriority = (photo: Photo): number => {
    const uploadStatus = (photo as any).uploadStatus;
    
    // Real-time active statuses (highest priority)
    if (uploadStatus === 'UPLOADING_TO_CLOUDINARY') return 100;
    if (uploadStatus === 'REGISTERING_METADATA') return 90;
    if (photo.status === 'PROCESSING') return 80;
    
    // Waiting/queued statuses (lower priority)
    if (uploadStatus === 'QUEUED') return 50;
    if (uploadStatus === 'UPLOADED_TO_CLOUDINARY') return 40;
    if (photo.status === 'UPLOADED') return 30; // Lowest priority - waiting state
    
    return 0;
  };
  
  // Sort photos by status priority (active first), then by creation date (newest first)
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      
      // First sort by priority (higher priority first)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      // If same priority, sort by date (newest first)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [photos]);

  if (loading && photos.length === 0) {
    return <LoadingSpinner />;
  }

  // Show empty state if no error and no photos, or if error indicates empty result
  if (sortedPhotos.length === 0) {
    const isBackendError = error && error.includes('Backend not available');
    
    if (isBackendError) {
      return (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⚠️</div>
          <h3 className={styles.emptyTitle}>Backend Not Available</h3>
          <p className={styles.emptyMessage}>
            Please ensure the backend server is running on port 8080.
          </p>
        </div>
      );
    }

    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📋</div>
        <h3 className={styles.emptyTitle}>Processing Queue is Empty</h3>
        <p className={styles.emptyMessage}>
          No photos are currently being processed. Upload photos to see them here.
        </p>
      </div>
    );
  }

  if (error && sortedPhotos.length === 0) {
    return (
      <div className={styles.error}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className={styles.queue}>
      {sortedPhotos.map((photo, index) => {
        const uploadStatus = (photo as any).uploadStatus;
        // Use a composite key that includes status for smooth transitions
        const itemKey = `${photo.id}-${uploadStatus || photo.status}`;
        return (
          <ProcessingQueueItem 
            key={itemKey} 
            photo={photo} 
            index={index} 
          />
        );
      })}
    </div>
  );
};

