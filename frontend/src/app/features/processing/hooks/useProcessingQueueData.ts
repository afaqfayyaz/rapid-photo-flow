import { useState, useEffect, useCallback, useRef } from 'react';
import { photoApi } from '../../photos/api/photoApi';
import { eventApi } from '../../events/api/eventApi';
import { Photo } from '../../../models/photo.model';
import { PhotoEvent } from '../../../models/event.model';

const POLL_INTERVAL = 2500; // 2.5 seconds
const EVENTS_PAGE_SIZE = 50; // Number of events to fetch per page

/**
 * Hook for Processing Queue page that polls photos and events
 * Only polls when the component is mounted, stops when unmounted
 * Supports pagination for events
 */
export const useProcessingQueueData = () => {
  const [processingPhotos, setProcessingPhotos] = useState<Photo[]>([]);
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsPage, setEventsPage] = useState(0);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (isPolling: boolean = false) => {
    if (!isMountedRef.current) return;

    try {
      // Fetch only UPLOADED and PROCESSING photos (active processing only)
      // Don't fetch COMPLETED - remove them from queue once done
      // Use large page size to get all processing photos
      const [uploadedResponse, processingResponse] = await Promise.all([
        photoApi.getAll('UPLOADED', 0, 1000),
        photoApi.getAll('PROCESSING', 0, 1000)
      ]);
      
      // For events, always fetch first page (newest events)
      // When polling, only refresh first page and keep older loaded events
      const eventsResponse = await eventApi.getAll(undefined, 0, EVENTS_PAGE_SIZE);

      if (!isMountedRef.current) return;

      // Combine only UPLOADED and PROCESSING photos (active processing)
      const allProcessingPhotos: Photo[] = [];
      if (uploadedResponse.status && uploadedResponse.data) {
        allProcessingPhotos.push(...uploadedResponse.data);
      }
      if (processingResponse.status && processingResponse.data) {
        allProcessingPhotos.push(...processingResponse.data);
      }
      
      // Remove duplicates by ID and sort by creation date
      const uniquePhotos = Array.from(
        new Map(allProcessingPhotos.map(photo => [photo.id, photo])).values()
      ).sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      setProcessingPhotos(uniquePhotos);

      if (eventsResponse.status && eventsResponse.data) {
        if (isPolling) {
          // When polling, only update the first page (newest events)
          // Keep the older events that were loaded via pagination
          setEvents((prev) => {
            // Only preserve older events if we have more than one page
            if (prev.length > EVENTS_PAGE_SIZE) {
              const olderEvents = prev.slice(EVENTS_PAGE_SIZE);
              return [...eventsResponse.data, ...olderEvents];
            }
            // If we don't have paginated events yet, just replace
            return eventsResponse.data;
          });
        } else {
          // Initial load - replace all events
          setEvents(eventsResponse.data);
          // Check if there are more events to load
          // If we got exactly EVENTS_PAGE_SIZE events, there might be more
          setHasMoreEvents(eventsResponse.data.length >= EVENTS_PAGE_SIZE);
        }
      } else {
        if (!isPolling) {
          setEvents([]);
          setHasMoreEvents(false);
        }
      }

      setIsLoading(false);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setIsLoading(false);
      if (!isPolling) {
        setHasMoreEvents(false);
      }
    }
  }, []); // Remove events.length dependency to prevent recreation

  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch (not polling)
    fetchData(false);

    // Start polling (refresh first page only, keep older events)
    pollIntervalRef.current = window.setInterval(() => {
      if (isMountedRef.current) {
        fetchData(true);
      }
    }, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current !== null) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchData]);

  const loadMoreEvents = useCallback(async () => {
    if (loadingMoreEvents || !hasMoreEvents) return;
    
    setLoadingMoreEvents(true);
    const nextPage = eventsPage + 1;
    
    try {
      const eventsResponse = await eventApi.getAll(undefined, nextPage, EVENTS_PAGE_SIZE);
      
      if (eventsResponse.status && eventsResponse.data) {
        setEvents((prev) => [...prev, ...eventsResponse.data]);
        setEventsPage(nextPage);
        // If we got fewer events than page size, there are no more
        setHasMoreEvents(eventsResponse.data.length === EVENTS_PAGE_SIZE);
      } else {
        setHasMoreEvents(false);
      }
    } catch (err) {
      console.error('Failed to load more events:', err);
      setHasMoreEvents(false);
    } finally {
      setLoadingMoreEvents(false);
    }
  }, [eventsPage, hasMoreEvents, loadingMoreEvents]);

  const refetch = useCallback(() => {
    setEventsPage(0);
    setHasMoreEvents(true);
    fetchData(false);
  }, [fetchData]);

  return {
    processingPhotos,
    events,
    isLoading,
    error,
    hasMoreEvents,
    loadingMoreEvents,
    loadMoreEvents,
    refetch,
  };
};

