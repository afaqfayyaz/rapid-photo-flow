import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useReviewPhotos } from '../hooks/useReviewPhotos';
import { PhotoGallery } from '../components/PhotoGallery/PhotoGallery';
import { Photo, PhotoStatus, DeleteMode, BulkDeleteRequest } from '../../../models/photo.model';
import { photoApi } from '../api/photoApi';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner/LoadingSpinner';
import { useToast } from '../../../shared/hooks/useToast';
import { Toast } from '../../../shared/components/Toast/Toast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import styles from './ReviewPhotosPage.module.css';

type ViewMode = 'all' | 'completed' | 'reviewed';

export const ReviewPhotosPage: React.FC = () => {
  const { 
    photos: photosFromHook, 
    loading, 
    error, 
    updatePhotoStatus, 
    removePhoto,
    restorePhoto,
    refetch
  } = useReviewPhotos();
  
  // Local state to override hook state for instant updates
  const [localPhotos, setLocalPhotos] = useState<Photo[] | null>(null);
  
  // Use local photos if available, otherwise use hook photos
  const photos = localPhotos !== null ? localPhotos : photosFromHook;
  
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectMode, setSelectMode] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const [failedDeletions, setFailedDeletions] = useState<Map<string, string>>(new Map()); // photoId -> error message
  
  // Bulk delete banner state
  type BulkDeleteBannerState = 'loading' | 'success' | 'error' | null;
  const [bulkDeleteBanner, setBulkDeleteBanner] = useState<BulkDeleteBannerState>(null);
  const [bulkDeleteBannerMessage, setBulkDeleteBannerMessage] = useState<string | null>(null);
  const successBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { toasts, showToast, removeToast } = useToast();

  // Memoized sorting function for performance
  const sortPhotos = useMemo(() => {
    return (photosToSort: Photo[]) => {
      return [...photosToSort].sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === 'name') {
          return a.originalFileName.localeCompare(b.originalFileName);
        } else {
          const sizeA = (a as any).sizeBytes || (a as any).fileSize || 0;
          const sizeB = (b as any).sizeBytes || (b as any).fileSize || 0;
          return sizeB - sizeA;
        }
      });
    };
  }, [sortBy]);

  // Compute completed and reviewed photos from current state
  const completedPhotos = useMemo(() => {
    const photosToUse = localPhotos !== null ? localPhotos : photosFromHook;
    return photosToUse.filter(p => p.status === PhotoStatus.COMPLETED);
  }, [photosFromHook, localPhotos]);

  const reviewedPhotos = useMemo(() => {
    const photosToUse = localPhotos !== null ? localPhotos : photosFromHook;
    return photosToUse.filter(p => p.status === PhotoStatus.REVIEWED);
  }, [photosFromHook, localPhotos]);

  // Get photos based on view mode - use local photos if available
  const displayedPhotos = useMemo(() => {
    const photosToUse = localPhotos !== null ? localPhotos : photosFromHook;
    let photosToDisplay: Photo[] = [];
    
    if (viewMode === 'completed') {
      photosToDisplay = completedPhotos;
    } else if (viewMode === 'reviewed') {
      photosToDisplay = reviewedPhotos;
    } else {
      photosToDisplay = photosToUse;
    }
    
    return sortPhotos(photosToDisplay);
  }, [viewMode, photosFromHook, localPhotos, completedPhotos, reviewedPhotos, sortPhotos]);

  // Initialize local photos from hook photos on mount
  useEffect(() => {
    if (localPhotos === null && photosFromHook.length > 0) {
      setLocalPhotos(photosFromHook);
    }
  }, [photosFromHook.length]); // Only trigger when hook photos change from empty to non-empty

  // Sync photos from hook (add new ones, update existing ones, but preserve deletions)
  useEffect(() => {
    if (localPhotos === null) {
      return;
    }
    
    // Create maps for faster lookup
    const localPhotoMap = new Map(localPhotos.map(p => [p.id, p]));
    const localPublicIdMap = new Map(
      localPhotos
        .filter(p => p.cloudinaryPublicId)
        .map(p => [p.cloudinaryPublicId!, p])
    );
    
    // Track which photos from hook we've seen
    const hookPhotoIds = new Set(photosFromHook.map(p => p.id));
    const hookPublicIds = new Set(
      photosFromHook
        .filter(p => p.cloudinaryPublicId)
        .map(p => p.cloudinaryPublicId!)
    );
    
    // Find photos that need to be added or updated from hook
    const photosToAddOrUpdate: Photo[] = [];
    const seenIds = new Set<string>();
    const seenPublicIds = new Set<string>();
    
    photosFromHook.forEach(hookPhoto => {
      // Skip if we've already processed this photo
      if (seenIds.has(hookPhoto.id)) return;
      if (hookPhoto.cloudinaryPublicId && seenPublicIds.has(hookPhoto.cloudinaryPublicId)) return;
      
      seenIds.add(hookPhoto.id);
      if (hookPhoto.cloudinaryPublicId) {
        seenPublicIds.add(hookPhoto.cloudinaryPublicId);
      }
      
      // Always add/update photos from hook (they're the source of truth)
      photosToAddOrUpdate.push(hookPhoto);
    });
    
    // Keep deleted photos (photos in local but not in hook - user deleted them)
    const deletedPhotos = localPhotos.filter(localPhoto => {
      // Keep if it's not in hook photos (user deleted it)
      if (!hookPhotoIds.has(localPhoto.id)) {
        // Also check by cloudinaryPublicId
        if (localPhoto.cloudinaryPublicId && !hookPublicIds.has(localPhoto.cloudinaryPublicId)) {
          return true; // Keep deleted photo
        }
      }
      return false;
    });
    
    // Only update if there are changes
    const hasChanges = photosToAddOrUpdate.length !== localPhotos.length - deletedPhotos.length ||
      photosToAddOrUpdate.some(hookPhoto => {
        const localPhoto = localPhotoMap.get(hookPhoto.id) || 
          (hookPhoto.cloudinaryPublicId ? localPublicIdMap.get(hookPhoto.cloudinaryPublicId) : null);
        return !localPhoto || localPhoto.status !== hookPhoto.status;
      });
    
    if (hasChanges) {
      setLocalPhotos(prev => {
        if (!prev) return photosFromHook;
        
        // Merge: photos from hook + deleted photos
        const merged = [...photosToAddOrUpdate, ...deletedPhotos];
        
        // Remove duplicates by id and cloudinaryPublicId (prefer hook photos)
        const unique = merged.reduce((acc, photo) => {
          // Check by id
          const existingById = acc.find(p => p.id === photo.id);
          if (existingById) {
            // Replace with hook photo if it exists (hook is source of truth)
            if (hookPhotoIds.has(photo.id)) {
              const index = acc.indexOf(existingById);
              acc[index] = photo;
            }
            return acc;
          }
          // Check by cloudinaryPublicId
          if (photo.cloudinaryPublicId) {
            const existingByPublicId = acc.find(p => 
              p.cloudinaryPublicId && p.cloudinaryPublicId === photo.cloudinaryPublicId
            );
            if (existingByPublicId) {
              // Replace with hook photo if it exists
              if (hookPublicIds.has(photo.cloudinaryPublicId)) {
                const index = acc.indexOf(existingByPublicId);
                acc[index] = photo;
              }
              return acc;
            }
          }
          acc.push(photo);
          return acc;
        }, [] as Photo[]);
        
        return unique.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    }
  }, [photosFromHook, localPhotos]);

  // Clean up selection when displayed photos change (e.g., after delete)
  useEffect(() => {
    setSelectedPhotoIds((prev) => {
      const displayedIds = new Set(displayedPhotos.map(p => p.id));
      const filtered = new Set(Array.from(prev).filter(id => displayedIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [displayedPhotos]);

  // Optimistic approve handler
  const handleApprove = async (photo: Photo) => {
    if (photo.status === PhotoStatus.REVIEWED) {
      return; // Already approved
    }

    setReviewing(photo.id);
    
    // Optimistic update: immediately move to REVIEWED
    const previousStatus = photo.status;
    updatePhotoStatus(photo.id, PhotoStatus.REVIEWED);

    try {
      await photoApi.updateStatus(photo.id, { status: PhotoStatus.REVIEWED });
      // Success - state already updated optimistically
      showToast('Photo approved successfully', 'success');
    } catch (err) {
      // Revert on error
      updatePhotoStatus(photo.id, previousStatus);
      showToast('Failed to approve photo — reverting', 'error');
      console.error('Failed to approve photo:', err);
    } finally {
      setReviewing(null);
    }
  };

  // Selection handlers
  const toggleSelect = useCallback((photoId: string) => {
    if (!selectMode) return;
    
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, [selectMode]);

  const clearSelection = useCallback(() => {
    setSelectedPhotoIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPhotoIds(new Set(displayedPhotos.map(p => p.id)));
  }, [displayedPhotos]);

  const toggleSelectAll = useCallback(() => {
    setSelectedPhotoIds((prev) => {
      // If all displayed photos are selected, deselect all
      // Otherwise, select all displayed photos
      const allSelected = displayedPhotos.every(p => prev.has(p.id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(displayedPhotos.map(p => p.id));
      }
    });
  }, [displayedPhotos]);

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        // Turning off select mode - clear selection
        setSelectedPhotoIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Single photo delete handler - with toast notifications
  const handleDelete = useCallback(async (photo: Photo) => {
    // Remove from selection first
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
    
    // Optimistically remove photo from UI immediately
    setLocalPhotos(prev => {
      if (!prev) return null;
      return prev.filter(p => p.id !== photo.id);
    });
    
    // Remove from hook state as well
    removePhoto(photo.id);

    try {
      const response = await photoApi.delete(photo.id);
      if (!response.status) {
        throw new Error(response.message || 'Delete failed');
      }
      
      // Success toast
      showToast('Photo deleted successfully', 'success');
      
      // Refetch photos from backend
      await refetch();
      
      // Reset local photos to null so it uses fresh data from hook
      setLocalPhotos(null);
    } catch (err) {
      // Restore photo on error
      await refetch();
      setLocalPhotos(null);
      showToast('Failed to delete photo', 'error');
      console.error('Failed to delete photo:', err);
    }
  }, [refetch, removePhoto, showToast]);

  // Bulk approve handler - improved for instant updates
  const handleBulkApprove = useCallback(async () => {
    if (selectedPhotoIds.size === 0) {
      return;
    }

    const photoIdsArray = Array.from(selectedPhotoIds);
    const photosToApprove = displayedPhotos.filter(p => selectedPhotoIds.has(p.id) && p.status === PhotoStatus.COMPLETED);
    
    if (photosToApprove.length === 0) {
      showToast('No completed photos selected to approve', 'info');
      return;
    }

    const photosToRestore = photosToApprove.map(p => ({ ...p }));

    // Optimistic update: immediately change status to REVIEWED
    photosToApprove.forEach(photo => {
      updatePhotoStatus(photo.id, PhotoStatus.REVIEWED);
    });
    
    // Clear selection immediately for better UX
    clearSelection();
    setReviewing(photoIdsArray[0]); // Show loading state

    try {
      // Use bulk update endpoint for better performance
      const photoIdsToApprove = photosToApprove.map(p => p.id);
      const response = await photoApi.bulkUpdateStatus(photoIdsToApprove, PhotoStatus.REVIEWED);
      
      if (!response.status) {
        throw new Error(response.message || 'Bulk approve failed');
      }
      
      // Success - status already updated optimistically
      showToast(`Approved ${photosToApprove.length} photo${photosToApprove.length > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      // Revert on error - restore original status
      photosToRestore.forEach(photo => {
        updatePhotoStatus(photo.id, photo.status);
      });
      showToast(`Failed to approve ${photosToApprove.length} photo${photosToApprove.length > 1 ? 's' : ''} — reverting`, 'error');
      console.error('Failed to approve photos:', err);
    } finally {
      setReviewing(null);
    }
  }, [selectedPhotoIds, displayedPhotos, updatePhotoStatus, clearSelection, showToast]);

  // Bulk delete handler - with banner states, error handling, and toast notifications
  const handleBulkDelete = useCallback(async () => {
    if (selectedPhotoIds.size === 0) {
      return;
    }

    const photoIdsArray = Array.from(selectedPhotoIds);
    const count = photoIdsArray.length;
    
    // Clear any existing timeout
    if (successBannerTimeoutRef.current) {
      clearTimeout(successBannerTimeoutRef.current);
      successBannerTimeoutRef.current = null;
    }
    
    // Show loading banner immediately
    setBulkDeleteBanner('loading');
    setBulkDeleteBannerMessage(null);
    setFailedDeletions(new Map());
    
    // Don't clear selection yet - keep it for error retry

    try {
      const request: BulkDeleteRequest = {
        photoIds: photoIdsArray,
      };
      
      const response = await photoApi.bulkDelete(request);
      // Check status and statusCode instead of data (data can be null for successful operations)
      if (!response.status || (response.statusCode && response.statusCode !== 200)) {
        throw new Error(response.message || 'Bulk delete failed');
      }
      
      // Handle case where data might be null (successful deletion with no data returned)
      if (!response.data) {
        // If status is true and statusCode is 200, treat as success
        if (response.status && (!response.statusCode || response.statusCode === 200)) {
          // All photos deleted successfully
          clearSelection();
          
          // Show success toast
          showToast(`Deleted ${count} photo${count > 1 ? 's' : ''} successfully`, 'success');
          
          // Show success banner
          setBulkDeleteBanner('success');
          setBulkDeleteBannerMessage(null);
          
          // Auto-dismiss success banner after 3.5 seconds
          successBannerTimeoutRef.current = setTimeout(() => {
            setBulkDeleteBanner(null);
            setBulkDeleteBannerMessage(null);
          }, 3500);
          
          // Refetch photos from backend
          await refetch();
          
          // Reset local photos to null so it uses fresh data from hook
          setLocalPhotos(null);
          return;
        } else {
          throw new Error(response.message || 'Bulk delete failed');
        }
      }
      
      const { deletedCount, requestedCount, cloudinaryFailed } = response.data;
      
      // Check if all photos were successfully deleted
      const isCompleteSuccess = deletedCount === requestedCount && (!cloudinaryFailed || cloudinaryFailed.length === 0);
      
      if (isCompleteSuccess) {
        // Complete success - all photos deleted
        clearSelection();
        
        // Show success toast
        showToast(`Deleted ${deletedCount} photo${deletedCount > 1 ? 's' : ''} successfully`, 'success');
        
        // Show success banner
        setBulkDeleteBanner('success');
        setBulkDeleteBannerMessage(null);
        
        // Auto-dismiss success banner after 3.5 seconds
        successBannerTimeoutRef.current = setTimeout(() => {
          setBulkDeleteBanner(null);
          setBulkDeleteBannerMessage(null);
        }, 3500);
        
        // Refetch photos from backend
        await refetch();
        
        // Reset local photos to null so it uses fresh data from hook
        setLocalPhotos(null);
        return;
      }
      
      // Check if all photos failed
      if (deletedCount === 0) {
        // All photos failed - show error
        const errorMessage = 'Failed to delete photos. Please try again.';
        setBulkDeleteBanner('error');
        setBulkDeleteBannerMessage(errorMessage);
        showToast(`Failed to delete ${requestedCount} photo${requestedCount > 1 ? 's' : ''}`, 'error');
        
        // Mark failed photos
        if (cloudinaryFailed && cloudinaryFailed.length > 0) {
          const failedMap = new Map<string, string>();
          cloudinaryFailed.forEach(failure => {
            failedMap.set(failure.photoId, failure.error);
          });
          setFailedDeletions(failedMap);
        }
        // Don't clear selection - allow retry
        return;
      }
      
      // Partial failure - some succeeded, some failed
      // Use a clear error message, not the backend message which might be confusing
      const errorMessage = `Deleted ${deletedCount} of ${requestedCount} photos. ${cloudinaryFailed?.length || 0} failed to delete from Cloudinary.`;
      setBulkDeleteBanner('error');
      setBulkDeleteBannerMessage(errorMessage);
      showToast(`Deleted ${deletedCount} of ${requestedCount} photo${requestedCount > 1 ? 's' : ''}`, 'error');
      
      // Mark failed photos
      if (cloudinaryFailed && cloudinaryFailed.length > 0) {
        const failedMap = new Map<string, string>();
        cloudinaryFailed.forEach(failure => {
          failedMap.set(failure.photoId, failure.error);
        });
        setFailedDeletions(failedMap);
      }
      
      // Clear selection since some succeeded
      clearSelection();
      // Refetch to update UI
      await refetch();
      setLocalPhotos(null);
      
      // Auto-dismiss success banner after 3.5 seconds
      successBannerTimeoutRef.current = setTimeout(() => {
        setBulkDeleteBanner(null);
        setBulkDeleteBannerMessage(null);
      }, 3500);
      
      // Refetch photos from backend
      await refetch();
      
      // Reset local photos to null so it uses fresh data from hook
      setLocalPhotos(null);
    } catch (err) {
      // Show error toast and banner - keep selection for retry
      let errorMessage = err instanceof Error ? err.message : 'Something went wrong while deleting the selected photos. Please try again.';
      
      // Clean up any confusing success text from error messages
      if (errorMessage.toLowerCase().includes('successfully') || errorMessage.toLowerCase().includes('deleted successfully')) {
        errorMessage = 'Something went wrong while deleting the selected photos. Please try again.';
      }
      
      showToast(`Failed to delete ${count} photo${count > 1 ? 's' : ''}`, 'error');
      setBulkDeleteBanner('error');
      setBulkDeleteBannerMessage(errorMessage);
      console.error('Failed to delete photos:', err);
    }
  }, [selectedPhotoIds, clearSelection, refetch, showToast]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successBannerTimeoutRef.current) {
        clearTimeout(successBannerTimeoutRef.current);
      }
    };
  }, []);

  // Delete All handler - with loading states and error handling
  const handleDeleteAll = useCallback(async () => {
    setShowDeleteAllDialog(false);
    setIsDeletingAll(true);
    setDeleteAllError(null);
    setFailedDeletions(new Map());

    // Determine mode based on current view
    let request: BulkDeleteRequest;
    
    if (viewMode === 'completed') {
      request = { mode: DeleteMode.ALL_COMPLETED };
    } else if (viewMode === 'reviewed') {
      request = { mode: DeleteMode.ALL_REVIEWED };
    } else {
      // Delete all photos in current view (both completed and reviewed)
      request = { 
        mode: DeleteMode.ALL,
        statusFilter: [PhotoStatus.COMPLETED, PhotoStatus.REVIEWED]
      };
    }

    try {
      const response = await photoApi.bulkDelete(request);
      // Check status and statusCode instead of data (data can be null for successful operations)
      if (!response.status || (response.statusCode && response.statusCode !== 200)) {
        throw new Error(response.message || 'Delete all failed');
      }
      
      // Handle case where data might be null (successful deletion with no data returned)
      if (!response.data) {
        // If status is true and statusCode is 200, treat as success
        if (response.status && (!response.statusCode || response.statusCode === 200)) {
          // All photos deleted successfully
          await refetch();
          setLocalPhotos(null);
          return;
        } else {
          throw new Error(response.message || 'Delete all failed');
        }
      }
      
      const { cloudinaryFailed } = response.data;
      
      // Handle partial failures - mark them
      if (cloudinaryFailed && cloudinaryFailed.length > 0) {
        const failedMap = new Map<string, string>();
        cloudinaryFailed.forEach(failure => {
          failedMap.set(failure.photoId, failure.error);
        });
        setFailedDeletions(failedMap);
      }
      
      // Refetch photos from backend
      await refetch();
      
      // Reset local photos to null so it uses fresh data from hook
      setLocalPhotos(null);
    } catch (err) {
      // Show error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete photos. Please try again.';
      setDeleteAllError(errorMessage);
      console.error('Failed to delete all photos:', err);
    } finally {
      setIsDeletingAll(false);
    }
  }, [viewMode, displayedPhotos, refetch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    const isBackendError = error.includes('Backend not available');
    
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Review Gallery
          </h1>
          <p className={styles.subtitle}>
            Review and approve completed photos
          </p>
        </div>
        <div className={styles.error}>
          {isBackendError ? (
            <>
              <div className={styles.errorIcon}>⚠️</div>
              <h3 className={styles.errorTitle}>Backend Not Available</h3>
              <p className={styles.errorMessage}>
                Please ensure the backend server is running on port 8080.
              </p>
            </>
          ) : (
            <>
              <strong>Error:</strong> {error}
            </>
          )}
        </div>
      </div>
    );
  }

  const allPhotos = localPhotos !== null ? localPhotos : photosFromHook;
  
  if (allPhotos.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Review Gallery
          </h1>
          <p className={styles.subtitle}>
            Review and approve completed photos
          </p>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🖼️</div>
          <h3 className={styles.emptyTitle}>No Photos to Review</h3>
          <p className={styles.emptyMessage}>
            There are no completed photos to review yet. Upload photos and wait for them to be processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Review Gallery
        </h1>
        <p className={styles.subtitle}>
          Review and approve completed photos
        </p>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterLeft}>
            <button
              className={`${styles.filterButton} ${viewMode === 'all' ? styles.active : ''}`}
              onClick={() => {
                setViewMode('all');
                if (selectMode) {
                  clearSelection();
                }
              }}
            >
              All Photos ({allPhotos.length})
            </button>
          <button
            className={`${styles.filterButton} ${viewMode === 'completed' ? styles.active : ''}`}
            onClick={() => {
              setViewMode('completed');
              if (selectMode) {
                clearSelection();
              }
            }}
          >
            Completed ({completedPhotos.length})
          </button>
          <button
            className={`${styles.filterButton} ${viewMode === 'reviewed' ? styles.active : ''}`}
            onClick={() => {
              setViewMode('reviewed');
              if (selectMode) {
                clearSelection();
              }
            }}
          >
            Approved ({reviewedPhotos.length})
          </button>
        </div>
        <div className={styles.filterRight}>
          <button
            className={`${styles.selectModeButton} ${selectMode ? styles.active : ''}`}
            onClick={toggleSelectMode}
            type="button"
          >
            {selectMode ? 'Cancel Selection' : 'Select Photos'}
          </button>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'size')}
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
          </select>
        </div>
      </div>

      {/* Bulk Delete Banner */}
      {bulkDeleteBanner && (
        <div 
          className={`${styles.bulkDeleteBanner} ${styles[bulkDeleteBanner]}`}
          role="alert"
          aria-live={bulkDeleteBanner === 'loading' ? 'polite' : 'assertive'}
        >
          <div className={styles.bannerContent}>
            {bulkDeleteBanner === 'loading' && (
              <>
                <div className={styles.bannerIcon}>
                  <div className={styles.bannerSpinner} aria-hidden="true"></div>
                </div>
                <div className={styles.bannerText}>
                  <h3 className={styles.bannerTitle}>Deleting selected photos…</h3>
                  <p className={styles.bannerDescription}>Please wait while we remove the selected photos.</p>
                </div>
              </>
            )}
            {bulkDeleteBanner === 'success' && (
              <>
                <div className={styles.bannerIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.bannerText}>
                  <h3 className={styles.bannerTitle}>Photos deleted successfully</h3>
                  <p className={styles.bannerDescription}>The selected photos have been removed from the gallery.</p>
                </div>
                <button
                  className={styles.bannerDismiss}
                  onClick={() => {
                    setBulkDeleteBanner(null);
                    setBulkDeleteBannerMessage(null);
                    if (successBannerTimeoutRef.current) {
                      clearTimeout(successBannerTimeoutRef.current);
                      successBannerTimeoutRef.current = null;
                    }
                  }}
                  type="button"
                  aria-label="Dismiss"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
            {bulkDeleteBanner === 'error' && (
              <>
                <div className={styles.bannerIcon}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.bannerText}>
                  <h3 className={styles.bannerTitle}>Failed to delete photos</h3>
                  <p className={styles.bannerDescription}>
                    {bulkDeleteBannerMessage && 
                     !bulkDeleteBannerMessage.toLowerCase().includes('successfully') &&
                     !bulkDeleteBannerMessage.toLowerCase().includes('deleted successfully')
                      ? bulkDeleteBannerMessage
                      : 'Something went wrong while deleting the selected photos. Please try again.'}
                  </p>
                </div>
                <button
                  className={styles.bannerDismiss}
                  onClick={() => {
                    setBulkDeleteBanner(null);
                    setBulkDeleteBannerMessage(null);
                  }}
                  type="button"
                  aria-label="Dismiss"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk action toolbar */}
      {selectMode && (
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkActionLeft}>
            {selectedPhotoIds.size > 0 ? (
              <>
                <span className={styles.bulkActionText}>
                  {selectedPhotoIds.size} photo{selectedPhotoIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  className={styles.clearSelectionButton}
                  onClick={clearSelection}
                  disabled={bulkDeleteBanner === 'loading'}
                  type="button"
                >
                  Clear
                </button>
              </>
            ) : (
              <>
                <span className={styles.bulkActionText}>
                  Select photos to perform bulk actions
                </span>
                <button
                  className={styles.selectAllButton}
                  onClick={selectAll}
                  type="button"
                >
                  Select All ({displayedPhotos.length})
                </button>
              </>
            )}
          </div>
          {selectedPhotoIds.size > 0 && (
            <div className={styles.bulkActionRight}>
              {displayedPhotos.filter(p => selectedPhotoIds.has(p.id) && p.status === PhotoStatus.COMPLETED).length > 0 && (
                <button
                  className={styles.bulkApproveButton}
                  onClick={handleBulkApprove}
                  disabled={reviewing !== null || bulkDeleteBanner === 'loading'}
                  type="button"
                >
                  {reviewing !== null ? 'Approving...' : `Approve Selected (${displayedPhotos.filter(p => selectedPhotoIds.has(p.id) && p.status === PhotoStatus.COMPLETED).length})`}
                </button>
              )}
              <button
                className={styles.bulkDeleteButton}
                onClick={handleBulkDelete}
                disabled={bulkDeleteBanner === 'loading'}
                type="button"
              >
                Delete Selected ({selectedPhotoIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'all' && (
        <>
          {displayedPhotos.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                All Photos ({allPhotos.length})
              </h2>
              <PhotoGallery 
                photos={displayedPhotos} 
                onReview={handleApprove}
                onDelete={handleDelete}
                reviewing={reviewing}
                deleting={deleting}
                selectedPhotoIds={selectedPhotoIds}
                onSelect={toggleSelect}
                showCheckbox={selectMode}
                selectMode={selectMode}
                failedDeletions={failedDeletions}
              />
            </div>
          )}
        </>
      )}

      {viewMode !== 'all' && (
        <PhotoGallery 
          photos={displayedPhotos} 
          onReview={handleApprove}
          onDelete={handleDelete}
          reviewing={reviewing}
          deleting={deleting}
          selectedPhotoIds={selectedPhotoIds}
          onSelect={toggleSelect}
          showCheckbox={selectMode}
          selectMode={selectMode}
          failedDeletions={failedDeletions}
        />
      )}

      {displayedPhotos.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🖼️</div>
          <h3 className={styles.emptyTitle}>
            {viewMode === 'completed' && 'No Completed Photos'}
            {viewMode === 'reviewed' && 'No Approved Photos'}
            {viewMode === 'all' && 'No Photos to Review'}
          </h3>
          <p className={styles.emptyMessage}>
            {viewMode === 'completed' && 'There are no completed photos yet. Upload photos and wait for them to be processed.'}
            {viewMode === 'reviewed' && 'No photos have been approved yet. Approve completed photos to see them here.'}
            {viewMode === 'all' && 'There are no photos to review yet. Upload photos and wait for them to be processed.'}
          </p>
        </div>
      )}

      {/* Toast notifications */}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Delete All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteAllDialog}
        title="Delete All Photos"
        message={`This will permanently delete ${displayedPhotos.length} photo${displayedPhotos.length > 1 ? 's' : ''} from RapidPhotoFlow and Cloudinary. This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={handleDeleteAll}
        onCancel={() => setShowDeleteAllDialog(false)}
        variant="danger"
      />
    </div>
  );
};


