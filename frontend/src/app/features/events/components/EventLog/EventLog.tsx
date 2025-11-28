import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PhotoEvent, EventType } from '../../../../models/event.model';
import { Photo } from '../../../../models/photo.model';
import { LoadingSpinner } from '../../../../shared/components/LoadingSpinner/LoadingSpinner';
import { useEventLog } from '../../hooks/useEventLog';
import styles from './EventLog.module.css';

export type EventFilter = 'all' | 'uploads' | 'processing' | 'completed' | 'errors';

interface EventLogProps {
  photoId?: string;
  onEventClick?: (photoId: string) => void;
  events?: PhotoEvent[]; // Accept events as prop instead of fetching
  hasMore?: boolean; // Whether there are more events to load
  loadMore?: () => void; // Function to load more events
  loadingMore?: boolean; // Whether more events are currently loading
  photos?: Photo[]; // Optional photo data for better group titles
}

interface EventGroup {
  id: string;
  title: string;
  events: PhotoEvent[];
  timestamp: string;
  isExpanded: boolean;
}

// Combine status changes within 5 seconds for the same photo
const combineStatusChanges = (events: PhotoEvent[]): PhotoEvent[] => {
  const combined: PhotoEvent[] = [];
  const statusChangeWindow = 5000; // 5 seconds in milliseconds

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    // Always keep non-status-change events (never combine errors or other event types)
    // Only combine PHOTO_STATUS_CHANGED events
    if (event.eventType !== EventType.PHOTO_STATUS_CHANGED) {
      combined.push(event);
      continue;
    }

    // For status changes, check if there are more status changes within 5 seconds
    const statusChanges: PhotoEvent[] = [event];
    let j = i + 1;
    
    while (
      j < events.length &&
      events[j].photoId === event.photoId &&
      events[j].eventType === EventType.PHOTO_STATUS_CHANGED &&
      new Date(events[j].timestamp).getTime() - new Date(event.timestamp).getTime() < statusChangeWindow
    ) {
      statusChanges.push(events[j]);
      j++;
    }

    if (statusChanges.length > 1) {
      // Extract statuses from messages and combine them
      const statuses = statusChanges.map(e => {
        // Try to extract status from message patterns like "Status changed to UPLOADED"
        const toMatch = e.message.match(/to (\w+)/i);
        const fromToMatch = e.message.match(/from (\w+) to (\w+)/i);
        if (fromToMatch) {
          return fromToMatch[2]; // Get the "to" status
        }
        if (toMatch) {
          return toMatch[1];
        }
        return null;
      }).filter((s): s is string => s !== null);

      // Create a cleaner combined message
      if (statuses.length > 0) {
        const uniqueStatuses = [...new Set(statuses)]; // Remove duplicates
        const combinedEvent: PhotoEvent = {
          ...event,
          message: `Status changed: ${uniqueStatuses.join(' → ')}`,
        };
        combined.push(combinedEvent);
      } else {
        combined.push(event);
      }
      i = j - 1; // Skip the combined events
    } else {
      combined.push(event);
    }
  }

  return combined;
};

// Group events by photoId or batch (same minute + same type)
const groupEvents = (events: PhotoEvent[], photosMap?: Map<string, Photo>): EventGroup[] => {
  const groups: Map<string, EventGroup> = new Map();
  const now = Date.now();
  const recentThreshold = 5 * 60 * 1000; // 5 minutes

  events.forEach((event) => {
    const eventTime = new Date(event.timestamp).getTime();
    const eventMinute = new Date(event.timestamp).setSeconds(0, 0);
    
    // Try to group by photoId first if photoId exists and has multiple events
    let groupKey: string;
    let groupTitle: string;
    
    if (event.photoId) {
      const photoEventsCount = events.filter(e => e.photoId === event.photoId).length;
      
      // Group by photoId if there are multiple events for this photo
      if (photoEventsCount > 1) {
        groupKey = `photo-${event.photoId}`;
        
        // Try to get photo file name from photosMap
        if (photosMap && photosMap.has(event.photoId)) {
          const photo = photosMap.get(event.photoId)!;
          const fileName = photo.originalFileName || photo.fileName || 'Unknown';
          // Truncate long file names
          groupTitle = fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName;
        } else {
          // Fallback to shortened photoId
          groupTitle = `Photo ${event.photoId.substring(0, 8)}...`;
        }
      } else {
        // Single event for this photo - group by batch
        groupKey = `batch-${eventMinute}-${event.eventType}`;
        const batchTime = new Date(eventMinute);
        groupTitle = `Batch at ${batchTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}`;
      }
    } else {
      // No photoId - group by batch (same minute + same type)
      groupKey = `batch-${eventMinute}-${event.eventType}`;
      const batchTime = new Date(eventMinute);
      groupTitle = `Batch at ${batchTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }

    if (!groups.has(groupKey)) {
      const isRecent = now - eventTime < recentThreshold;
      groups.set(groupKey, {
        id: groupKey,
        title: groupTitle,
        events: [],
        timestamp: event.timestamp,
        isExpanded: isRecent, // Recent groups expanded by default
      });
    }

    groups.get(groupKey)!.events.push(event);
  });

  return Array.from(groups.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const getEventConfig = (eventType: EventType) => {
  switch (eventType) {
    case EventType.PHOTO_UPLOADED:
      return {
        icon: '📤',
        color: '#6366f1',
        bgColor: '#eef2ff',
        label: 'Uploaded',
      };
    case EventType.PHOTO_STATUS_CHANGED:
      return {
        icon: '🔄',
        color: '#8b5cf6',
        bgColor: '#f3e8ff',
        label: 'Status Changed',
      };
    case EventType.PHOTO_PROCESSING_STARTED:
      return {
        icon: '⚙️',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        label: 'Processing',
      };
    case EventType.PHOTO_PROCESSING_COMPLETED:
      return {
        icon: '✅',
        color: '#10b981',
        bgColor: '#d1fae5',
        label: 'Completed',
      };
    case EventType.PHOTO_PROCESSING_FAILED:
      return {
        icon: '❌',
        color: '#ef4444',
        bgColor: '#fee2e2',
        label: 'Failed',
      };
    case EventType.PHOTO_REVIEWED:
      return {
        icon: '⭐',
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        label: 'Reviewed',
      };
    case EventType.PHOTO_DELETED:
      return {
        icon: '🗑️',
        color: '#ef4444',
        bgColor: '#fee2e2',
        label: 'Deleted',
      };
    default:
      return {
        icon: '•',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        label: 'Event',
      };
  }
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatExactTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const EventLog: React.FC<EventLogProps> = ({ 
  photoId, 
  onEventClick, 
  events: providedEvents,
  hasMore: providedHasMore,
  loadMore: providedLoadMore,
  loadingMore: providedLoadingMore,
  photos
}) => {
  // If events are provided as props, use them (for Processing Queue page)
  // Otherwise, use useEventLog hook for photo-specific events
  const specificEventLog = useEventLog(photoId);
  
  // Local filter state
  const [localFilter, setLocalFilter] = useState<EventFilter>('all');
  
  // Choose data source: provided events (from props) or from hook
  const allEvents = providedEvents || (photoId ? specificEventLog.events : []);
  const loading = providedEvents ? false : (photoId ? specificEventLog.loading : false);
  const error = providedEvents ? null : (photoId ? specificEventLog.error : null);
  const hasMore = providedEvents 
    ? (providedHasMore ?? false) 
    : (photoId ? specificEventLog.hasMore : false);
  const loadMore = providedEvents 
    ? (providedLoadMore ?? (() => {})) 
    : (photoId ? specificEventLog.loadMore : () => {});
  const loadingMore = providedEvents 
    ? (providedLoadingMore ?? false) 
    : false;
  const filter = photoId ? specificEventLog.filter : localFilter;
  const setFilter = photoId ? specificEventLog.setFilter : setLocalFilter;
  
  // Filter events based on selected filter
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

  const events = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter((event) => getEventCategory(event.eventType) === filter);
  }, [allEvents, filter]);
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Create photos map for better group titles
  const photosMap = useMemo(() => {
    if (!photos) return undefined;
    return new Map(photos.map(p => [p.id, p]));
  }, [photos]);

  // Combine status changes and group events
  const processedEvents = useMemo(() => {
    const combined = combineStatusChanges(events);
    return groupEvents(combined, photosMap);
  }, [events, photosMap]);

  // No infinite scroll - user must click "Load more" button

  // Initialize expanded groups for recent events
  React.useEffect(() => {
    const recentGroups = processedEvents
      .filter(g => g.isExpanded)
      .map(g => g.id);
    setExpandedGroups(new Set(recentGroups));
  }, [processedEvents.length]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleEventClick = (event: PhotoEvent) => {
    if (onEventClick && event.photoId) {
      onEventClick(event.photoId);
    }
  };

  if (loading && events.length === 0) {
    return <LoadingSpinner />;
  }

  if (error && events.length === 0) {
    return (
      <div className={styles.error}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className={styles.log} ref={logContainerRef}>
      <div className={styles.header}>
        <h3 className={styles.title}>Activity</h3>
        <span className={styles.count}>{events.length}</span>
      </div>

      {/* Filter pills */}
      <div className={styles.filters}>
        {(['all', 'uploads', 'processing', 'completed', 'errors'] as EventFilter[]).map((filterType) => (
          <button
            key={filterType}
            className={`${styles.filterPill} ${filter === filterType ? styles.active : ''}`}
            onClick={() => setFilter(filterType)}
            type="button"
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className={styles.emptyIcon}>
            <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="2"/>
            <path d="M24 16V24M24 32H24.01" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p>No events yet</p>
          <span className={styles.emptySubtext}>Activity will appear here</span>
        </div>
      ) : (
        <>
          <div className={styles.timeline}>
            {processedEvents.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const groupConfig = getEventConfig(group.events[0]?.eventType || EventType.PHOTO_UPLOADED);

              return (
                <div key={group.id} className={styles.group}>
                  <button
                    className={styles.groupHeader}
                    onClick={() => toggleGroup(group.id)}
                    type="button"
                  >
                    <span className={styles.groupIcon}>{isExpanded ? '▼' : '▶'}</span>
                    <span className={styles.groupTitle}>{group.title}</span>
                    <span className={styles.groupCount}>({group.events.length})</span>
                    <span className={styles.groupTime}>
                      {formatRelativeTime(group.timestamp)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className={styles.groupEvents}>
                      {group.events.map((event, index) => {
                        const config = getEventConfig(event.eventType);
                        const isLast = index === group.events.length - 1;

                        return (
                          <div
                            key={event.id}
                            className={`${styles.timelineItem} ${styles.clickable}`}
                            onClick={() => handleEventClick(event)}
                            onMouseEnter={() => setHoveredEvent(event.id)}
                            onMouseLeave={() => setHoveredEvent(null)}
                          >
                            <div className={styles.timelineLine} style={{ display: isLast ? 'none' : 'block' }} />
                            <div
                              className={styles.timelineDot}
                              style={{
                                backgroundColor: config.bgColor,
                                borderColor: config.color,
                              }}
                            >
                              <span className={styles.icon} style={{ color: config.color }}>
                                {config.icon}
                              </span>
                            </div>
                            <div className={styles.eventContent}>
                              <div className={styles.eventHeader}>
                                <span className={styles.eventLabel} style={{ color: config.color }}>
                                  {config.label}
                                </span>
                                <span
                                  className={styles.timestamp}
                                  title={formatExactTime(event.timestamp)}
                                >
                                  {hoveredEvent === event.id
                                    ? formatExactTime(event.timestamp)
                                    : formatRelativeTime(event.timestamp)}
                                </span>
                              </div>
                              <div className={styles.message}>{event.message}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Load more button */}
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={loadMore}
                disabled={loadingMore || loading}
                type="button"
              >
                {loadingMore ? 'Loading...' : 'Load older activity'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

