import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { photoApi } from '../../features/photos/api/photoApi';
import { eventApi } from '../../features/events/api/eventApi';
import { Photo } from '../../models/photo.model';
import { PhotoEvent } from '../../models/event.model';

interface PhotoDataContextValue {
  processingPhotos: Photo[];
  events: PhotoEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const PhotoDataContext = createContext<PhotoDataContextValue | undefined>(undefined);

const ACTIVE_POLL_INTERVAL = 2500; // 2.5 seconds when there are active photos
const IDLE_POLL_INTERVAL = 20000; // 20 seconds when idle

export const PhotoDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [processingPhotos, setProcessingPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const currentIntervalRef = useRef<number>(IDLE_POLL_INTERVAL);

  const fetchProcessingPhotos = useCallback(async (): Promise<Photo[]> => {
    try {
      // Fetch ALL photos with large page size to get all processing photos, not just first 20
      const response = await photoApi.getAll(undefined, 0, 1000);
      if (response.status && response.data) {
        // Filter for photos in processing queue (UPLOADED or PROCESSING)
        return response.data.filter(
          (photo) => photo.status === 'UPLOADED' || photo.status === 'PROCESSING'
        );
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch processing photos:', err);
      return [];
    }
  }, []);

  const fetchEvents = useCallback(async (): Promise<PhotoEvent[]> => {
    try {
      const response = await eventApi.getAll(undefined, 0, 50);
      if (response.status && response.data) {
        return response.data;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch events:', err);
      return [];
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const [photos, eventData] = await Promise.all([
        fetchProcessingPhotos(),
        fetchEvents(),
      ]);

      setProcessingPhotos(photos);
      setEvents(eventData);
      setIsLoading(false);
      setError(null);

      // Adjust polling interval based on activity
      const hasActivePhotos = photos.length > 0;
      const newInterval = hasActivePhotos ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

      if (newInterval !== currentIntervalRef.current) {
        currentIntervalRef.current = newInterval;
        if (pollIntervalRef.current !== null) {
          clearInterval(pollIntervalRef.current);
        }
        pollIntervalRef.current = window.setInterval(() => {
          poll();
        }, newInterval);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [fetchProcessingPhotos, fetchEvents]);

  const refetch = useCallback(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    const initialFetch = async () => {
      await poll();
    };
    initialFetch();

    // Start polling
    pollIntervalRef.current = window.setInterval(() => {
      if (isMounted) {
        poll();
      }
    }, currentIntervalRef.current);

    return () => {
      isMounted = false;
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const value: PhotoDataContextValue = {
    processingPhotos,
    events,
    isLoading,
    error,
    refetch,
  };

  return (
    <PhotoDataContext.Provider value={value}>
      {children}
    </PhotoDataContext.Provider>
  );
};

export const useSharedPhotoData = (): PhotoDataContextValue => {
  const context = useContext(PhotoDataContext);
  if (context === undefined) {
    throw new Error('useSharedPhotoData must be used within a PhotoDataProvider');
  }
  return context;
};

