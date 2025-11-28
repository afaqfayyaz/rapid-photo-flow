import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { photoApi } from '../api/photoApi';
import { Photo, PhotoStatus } from '../../../models/photo.model';

/**
 * Custom hook for Review Gallery that fetches both COMPLETED and REVIEWED photos
 * Uses large page size to fetch all photos at once
 * Fetches on mount and when tab becomes visible (no continuous polling)
 */
export const useReviewPhotos = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnVisibleRef = useRef(false);

  const fetchPhotos = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch all photos regardless of status to show everything
      // This includes UPLOADED, PROCESSING, COMPLETED, and REVIEWED
      const allPhotosResponse = await photoApi.getAll(undefined, 0, 1000);
      
      if (allPhotosResponse.status && allPhotosResponse.data) {
        console.log(`[useReviewPhotos] Fetched ${allPhotosResponse.data.length} photos from API`);
        
        // Remove duplicates by both id and cloudinaryPublicId
        const uniquePhotos = allPhotosResponse.data.reduce((acc, photo) => {
          // Check for duplicates by id
          const existingById = acc.find(p => p.id === photo.id);
          if (existingById) {
            return acc; // Skip duplicate by id
          }
          
          // Check for duplicates by cloudinaryPublicId (if available)
          if (photo.cloudinaryPublicId) {
            const existingByPublicId = acc.find(p => 
              p.cloudinaryPublicId && p.cloudinaryPublicId === photo.cloudinaryPublicId
            );
            if (existingByPublicId) {
              return acc; // Skip duplicate by cloudinaryPublicId
            }
          }
          
          acc.push(photo);
          return acc;
        }, [] as Photo[]);
        
        console.log(`[useReviewPhotos] After deduplication: ${uniquePhotos.length} unique photos`);
        console.log(`[useReviewPhotos] Status breakdown:`, {
          COMPLETED: uniquePhotos.filter(p => p.status === PhotoStatus.COMPLETED).length,
          FAILED: uniquePhotos.filter(p => p.status === PhotoStatus.FAILED).length,
          UPLOADED: uniquePhotos.filter(p => p.status === PhotoStatus.UPLOADED).length,
          PROCESSING: uniquePhotos.filter(p => p.status === PhotoStatus.PROCESSING).length,
          REVIEWED: uniquePhotos.filter(p => p.status === PhotoStatus.REVIEWED).length,
        });
        
        setPhotos(uniquePhotos);
      } else {
        console.warn('[useReviewPhotos] API response failed or no data:', allPhotosResponse);
        setPhotos([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photos';
      setError(errorMessage);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount
    fetchPhotos();

    // Fetch when tab becomes visible (user switches back to this tab)
    // This handles the case where photos completed while user was on another tab
    const handleVisibilityChange = () => {
      if (!document.hidden && !hasFetchedOnVisibleRef.current) {
        // Tab became visible - fetch once to get any new completed photos
        fetchPhotos();
        hasFetchedOnVisibleRef.current = true;
        
        // Reset flag after a delay so it can fetch again if user switches tabs multiple times
        setTimeout(() => {
          hasFetchedOnVisibleRef.current = false;
        }, 2000); // Reset after 2 seconds
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPhotos]);

  // Memoized selectors for performance
  const completedPhotos = useMemo(() => 
    photos.filter(p => p.status === PhotoStatus.COMPLETED),
    [photos]
  );

  const reviewedPhotos = useMemo(() => 
    photos.filter(p => p.status === PhotoStatus.REVIEWED),
    [photos]
  );

  // Optimistic update functions
  const updatePhotoStatus = useCallback((photoId: string, newStatus: PhotoStatus) => {
    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === photoId ? { ...photo, status: newStatus } : photo
      )
    );
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }, []);

  const restorePhoto = useCallback((photo: Photo) => {
    setPhotos((prev) => {
      // Check if photo already exists (avoid duplicates)
      if (!prev.find(p => p.id === photo.id)) {
        return [...prev, photo].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return prev;
    });
  }, []);

  return {
    photos,
    completedPhotos,
    reviewedPhotos,
    loading,
    error,
    refetch: fetchPhotos, // Manual refresh if needed (e.g., after delete operations)
    updatePhotoStatus,
    removePhoto,
    restorePhoto,
  };
};

