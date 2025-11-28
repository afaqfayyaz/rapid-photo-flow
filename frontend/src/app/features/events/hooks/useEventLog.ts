import { useState, useEffect, useCallback } from 'react';
import { eventApi } from '../api/eventApi';
import { PhotoEvent, EventType } from '../../../models/event.model';

export type EventFilter = 'all' | 'uploads' | 'processing' | 'completed' | 'errors';

const PAGE_SIZE = 20;

export const useEventLog = (photoId?: string) => {
  const [events, setEvents] = useState<PhotoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<EventFilter>('all');

  const fetchEvents = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      setError(null);
      if (!append) {
        setLoading(true);
      }
      
      const response = await eventApi.getAll(photoId, pageNum, PAGE_SIZE);
      
      if (response.status && response.data) {
        if (append) {
          setEvents((prev) => [...prev, ...response.data]);
        } else {
          setEvents(response.data);
        }
        
        // Check if there are more events
        // When photoId is provided, backend returns all events (no pagination)
        // When photoId is not provided, pagination works
        if (photoId) {
          setHasMore(false); // All events for this photo are returned
        } else {
          setHasMore(response.data.length === PAGE_SIZE);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    setPage(0);
    setEvents([]);
    fetchEvents(0, false);
  }, [fetchEvents]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, true);
  }, [page, fetchEvents]);

  const getEventCategory = (eventType: EventType): EventFilter => {
    switch (eventType) {
      case EventType.PHOTO_UPLOADED:
      case EventType.PHOTO_DELETED:
        return 'uploads';
      case EventType.PHOTO_PROCESSING_STARTED:
      case EventType.PHOTO_STATUS_CHANGED:
        return 'processing';
      case EventType.PHOTO_PROCESSING_COMPLETED:
      case EventType.PHOTO_REVIEWED:
        return 'completed';
      case EventType.PHOTO_PROCESSING_FAILED:
        return 'errors';
      default:
        return 'all';
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    return getEventCategory(event.eventType) === filter;
  });

  return {
    events: filteredEvents,
    allEvents: events,
    loading,
    error,
    hasMore,
    loadMore,
    filter,
    setFilter,
    refetch: () => fetchEvents(0, false),
  };
};

