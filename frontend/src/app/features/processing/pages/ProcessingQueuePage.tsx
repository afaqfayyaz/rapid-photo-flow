import React from 'react';
import { ProcessingQueue } from '../components/ProcessingQueue/ProcessingQueue';
import { EventLog } from '../../events/components/EventLog/EventLog';
import { useProcessingQueueData } from '../hooks/useProcessingQueueData';
import { useUpload } from '../../../shared/contexts/UploadContext';
import { Logo } from '../../../shared/components/Logo/Logo';
import { Photo, PhotoStatus } from '../../../models/photo.model';
import styles from './ProcessingQueuePage.module.css';

export const ProcessingQueuePage: React.FC = () => {
  // This hook only polls when this page is mounted
  const { 
    processingPhotos, 
    events, 
    isLoading, 
    error,
    hasMoreEvents,
    loadingMoreEvents,
    loadMoreEvents
  } = useProcessingQueueData();
  
  // Get upload progress from UploadContext for monitoring
  const { progress, items, isUploading, retryFailedCloudinaryUploads, retryFailedRegistrations } = useUpload();
  
  // Convert uploading items to Photo-like format for display
  const uploadingPhotos = React.useMemo(() => {
    return items
      .filter(item => 
        item.status === 'QUEUED' || 
        item.status === 'UPLOADING_TO_CLOUDINARY' || 
        item.status === 'UPLOADED_TO_CLOUDINARY' ||
        item.status === 'REGISTERING_METADATA'
      )
      .map(item => {
        // Map upload status to PhotoStatus, but keep original status in a custom field
        let photoStatus: PhotoStatus = PhotoStatus.UPLOADED;
        if (item.status === 'QUEUED' || item.status === 'UPLOADING_TO_CLOUDINARY') {
          photoStatus = PhotoStatus.UPLOADED;
        } else if (item.status === 'UPLOADED_TO_CLOUDINARY' || item.status === 'REGISTERING_METADATA') {
          photoStatus = PhotoStatus.UPLOADED;
        }
        
        // Create a preview URL for files that haven't been uploaded yet
        let previewUrl: string | undefined;
        if (!item.cloudinaryUrl && (item.status === 'QUEUED' || item.status === 'UPLOADING_TO_CLOUDINARY')) {
          try {
            previewUrl = URL.createObjectURL(item.file);
          } catch (e) {
            // Fallback to placeholder if object URL creation fails
            previewUrl = undefined;
          }
        }
        
        const photoObj = {
          id: item.tempId,
          cloudinaryPublicId: item.cloudinaryPublicId,
          cloudinaryUrl: item.cloudinaryUrl,
          originalFileName: item.fileName,
          sizeBytes: item.file.size,
          contentType: item.file.type || 'image/jpeg',
          status: photoStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          thumbnailUrl: item.cloudinaryUrl || previewUrl,
          filePath: item.cloudinaryUrl || previewUrl,
          // Store original upload status for display - this is critical for status badge
          uploadStatus: item.status,
        } as Photo & { uploadStatus?: string };
        
        return photoObj;
      });
  }, [items]);
  
  // Create event map by photoId for real-time monitoring
  const eventsByPhotoId = React.useMemo(() => {
    const eventMap = new Map<string, typeof events[0]>();
    events.forEach(event => {
      // Keep the most recent event for each photo
      const existing = eventMap.get(event.photoId);
      if (!existing || new Date(event.timestamp) > new Date(existing.timestamp)) {
        eventMap.set(event.photoId, event);
      }
    });
    return eventMap;
  }, [events]);
  
  // Combine uploading photos with processing photos
  // Also check if backend photos are in the process of being registered
  // Enhance with event data for comprehensive monitoring
  const allProcessingPhotos = React.useMemo(() => {
    // Create a map of uploading photos by cloudinaryPublicId for quick lookup
    const uploadingMap = new Map(
      uploadingPhotos
        .filter(p => p.cloudinaryPublicId)
        .map(p => [p.cloudinaryPublicId!, p])
    );
    
    // Process backend photos - if they match an uploading photo, use the uploading version
    // Otherwise, check if they're in the upload context with registering status
    // Enhance with event data for real-time monitoring
    const enhancedProcessingPhotos = processingPhotos.map(photo => {
      // Get latest event for this photo
      const latestEvent = eventsByPhotoId.get(photo.id);
      
      let enhancedPhoto: Photo & { uploadStatus?: string; latestEvent?: typeof events[0] } = {
        ...photo,
        latestEvent,
      };
      
      if (photo.cloudinaryPublicId && uploadingMap.has(photo.cloudinaryPublicId)) {
        // This photo is in the upload context - use that version for accurate status
        enhancedPhoto = {
          ...uploadingMap.get(photo.cloudinaryPublicId)!,
          latestEvent,
        };
      } else {
        // Check if this photo is in the upload context by cloudinaryPublicId
        const matchingUploadItem = items.find(item => 
          item.cloudinaryPublicId === photo.cloudinaryPublicId && 
          (item.status === 'REGISTERING_METADATA' || item.status === 'UPLOADED_TO_CLOUDINARY')
        );
        
        if (matchingUploadItem) {
          // This backend photo is being registered - add uploadStatus
          enhancedPhoto = {
            ...photo,
            uploadStatus: matchingUploadItem.status,
            latestEvent,
          };
        }
      }
      
      return enhancedPhoto;
    });
    
    // Add uploading photos that aren't in backend yet
    const uploadingNotInBackend = uploadingPhotos.filter(uploadPhoto => {
      if (!uploadPhoto.cloudinaryPublicId) return true; // Photos without cloudinaryPublicId are new
      return !processingPhotos.some(p => p.cloudinaryPublicId === uploadPhoto.cloudinaryPublicId);
    }).map(uploadPhoto => ({
      ...uploadPhoto,
      latestEvent: uploadPhoto.id ? eventsByPhotoId.get(uploadPhoto.id) : undefined,
    }));
    
    // Remove duplicates by ID and cloudinaryPublicId
    // When a photo exists in both backend and upload context, prefer the version with active uploadStatus
    // Otherwise prefer backend photo (has real ID)
    const allPhotos = [...enhancedProcessingPhotos, ...uploadingNotInBackend];
    const photoMap = new Map<string, Photo & { uploadStatus?: string; latestEvent?: typeof events[0] }>();
    
    allPhotos.forEach(photo => {
      const key = photo.cloudinaryPublicId || photo.id;
      const existing = photoMap.get(key);
      
      if (!existing) {
        photoMap.set(key, photo);
      } else {
        // If existing photo has active uploadStatus, keep it
        const existingUploadStatus = (existing as any).uploadStatus;
        const photoUploadStatus = (photo as any).uploadStatus;
        const hasActiveUploadStatus = (status: string | undefined) => 
          status && ['QUEUED', 'UPLOADING_TO_CLOUDINARY', 'UPLOADED_TO_CLOUDINARY', 'REGISTERING_METADATA'].includes(status);
        
        if (hasActiveUploadStatus(photoUploadStatus) && !hasActiveUploadStatus(existingUploadStatus)) {
          photoMap.set(key, photo);
        } else if (!hasActiveUploadStatus(photoUploadStatus) && hasActiveUploadStatus(existingUploadStatus)) {
          // Keep existing
        } else {
          // Both same, prefer backend photo (real ID, not tempId)
          const isBackendPhoto = photo.id && photo.id.length > 15; // Real IDs are longer
          const isExistingBackendPhoto = existing.id && existing.id.length > 15;
          if (isBackendPhoto && !isExistingBackendPhoto) {
            photoMap.set(key, photo);
          }
        }
      }
    });
    
    const uniquePhotos = Array.from(photoMap.values());
    
    // Filter out completed photos - only show actively uploading, registering, or processing
    const activePhotos = uniquePhotos.filter(photo => {
      const uploadStatus = (photo as any).uploadStatus;
      const photoStatus = photo.status;
      
      // Show photos that are actively uploading or registering (from upload context)
      if (uploadStatus) {
        const isActiveUploadStatus = uploadStatus === 'QUEUED' || 
                                     uploadStatus === 'UPLOADING_TO_CLOUDINARY' || 
                                     uploadStatus === 'UPLOADED_TO_CLOUDINARY' ||
                                     uploadStatus === 'REGISTERING_METADATA';
        
        if (isActiveUploadStatus) {
          return true;
        }
        // If uploadStatus exists but doesn't match active states, don't show it
        // (this handles edge cases where uploadStatus might be set incorrectly)
      }
      
      // Show backend photos that are UPLOADED (waiting for processing) or PROCESSING
      // These are photos that have been registered and are in the processing pipeline
      // Remove COMPLETED photos from the queue
      if (photoStatus === 'UPLOADED' || photoStatus === 'PROCESSING') {
        return true;
      }
      
      // Don't show anything else (including COMPLETED)
      return false;
    });
    
    return activePhotos;
  }, [uploadingPhotos, processingPhotos, items, eventsByPhotoId]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Logo size="large" showText={true} />
        <h1 className={styles.title}>
          Processing Queue
        </h1>
        <p className={styles.subtitle}>
          Monitor photos being processed in real-time
        </p>
      </div>
      
      {/* Upload Progress Monitoring - Single Progress Bar */}
      {isUploading && progress.total > 0 && (
        <div className={styles.uploadProgressSection}>
          <h2 className={styles.uploadProgressTitle}>Current Upload Progress</h2>
          
          {/* Single Progress Bar for Cloudinary Upload */}
          <div className={styles.stageContainer}>
            <div className={styles.stageLabel}>
              <span className={styles.stageTitle}>Uploading photos:</span>
              <span className={styles.stageCount}>
                {progress.cloudinaryUploaded + progress.cloudinaryFailed} of {progress.total} completed
                {progress.cloudinaryUploading > 0 && ` (${progress.cloudinaryUploading} uploading)`}
              </span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ 
                  width: `${progress.total > 0 ? ((progress.cloudinaryUploaded + progress.cloudinaryFailed) / progress.total) * 100 : 0}%` 
                }}
              />
            </div>
            {progress.cloudinaryFailed > 0 && (
              <div className={styles.errorMessage}>
                ⚠️ {progress.cloudinaryFailed} photo{progress.cloudinaryFailed > 1 ? 's' : ''} failed to upload
              </div>
            )}
          </div>

          {/* Summary */}
          <div className={styles.summaryText}>
            {isUploading 
              ? `Uploading: ${progress.cloudinaryUploaded} uploaded, ${progress.cloudinaryFailed} failed out of ${progress.total} photos`
              : `✅ ${progress.completed} photos fully completed${progress.failed > 0 ? `, ${progress.failed} failed` : ''}`
            }
          </div>

          {/* Retry Buttons */}
          {!isUploading && progress.failed > 0 && (
            <div className={styles.retryContainer}>
              {progress.cloudinaryFailed > 0 && (
                <div className={styles.retrySection}>
                  <span className={styles.retryMessage}>
                    {progress.cloudinaryFailed} photo{progress.cloudinaryFailed > 1 ? 's' : ''} failed to upload to Cloudinary. Retry upload?
                  </span>
                  <button
                    className={styles.retryButton}
                    onClick={retryFailedCloudinaryUploads}
                    type="button"
                  >
                    Retry Cloudinary Upload ({progress.cloudinaryFailed})
                  </button>
                </div>
              )}
              {progress.registrationFailed > 0 && (
                <div className={styles.retrySection}>
                  <span className={styles.retryMessage}>
                    {progress.registrationFailed} photo{progress.registrationFailed > 1 ? 's' : ''} failed to register in backend (already uploaded to Cloudinary). Retry registration?
                  </span>
                  <button
                    className={styles.retryButton}
                    onClick={retryFailedRegistrations}
                    type="button"
                  >
                    Retry Backend Registration ({progress.registrationFailed})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={styles.content}>
        {!isLoading && allProcessingPhotos.length > 0 && (
          <div className={styles.queueHeader}>
            <h2 className={styles.queueTitle}>
              Active Processing ({allProcessingPhotos.length})
              {uploadingPhotos.length > 0 && (
                <span className={styles.uploadingBadge}>
                  {uploadingPhotos.length} uploading
                </span>
              )}
            </h2>
          </div>
        )}
        <ProcessingQueue photos={allProcessingPhotos} loading={isLoading} error={error} />
      </div>
      <div className={styles.sidebar}>
        <EventLog 
          events={events} 
          hasMore={hasMoreEvents}
          loadMore={loadMoreEvents}
          loadingMore={loadingMoreEvents}
          photos={processingPhotos}
          onEventClick={(photoId) => {
            // Scroll to photo in processing queue or highlight it
            console.log('Event clicked for photo:', photoId);
            // TODO: Implement photo highlighting/focusing
          }}
        />
      </div>
    </div>
  );
};

