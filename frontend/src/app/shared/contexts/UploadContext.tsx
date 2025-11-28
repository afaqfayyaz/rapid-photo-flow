import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { photoApi } from '../../features/photos/api/photoApi';
import { PhotoRegisterRequest } from '../../models/photo.model';
import { uploadToCloudinary } from '../../core/services/cloudinary.service';
import { UploadItem, UploadItemStatus, BulkRegistrationItemResult } from '../../models/upload.model';

// Simple UUID generator
const generateUUID = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
};

interface UploadProgress {
  total: number;
  // Cloudinary upload stage
  cloudinaryUploaded: number; // Successfully uploaded to Cloudinary
  cloudinaryFailed: number; // Failed to upload to Cloudinary
  cloudinaryUploading: number; // Currently uploading to Cloudinary
  // Backend registration stage
  registered: number; // Successfully registered in backend
  registrationFailed: number; // Failed to register in backend (but uploaded to Cloudinary)
  registering: number; // Currently registering metadata
  // Overall
  completed: number; // Fully completed (registered)
  failed: number; // Any failure (cloudinary or registration)
}

interface UploadContextValue {
  items: UploadItem[]; // Current session items
  isUploading: boolean;
  error: string | null;
  progress: UploadProgress;
  uploadPhotos: (files: File[]) => Promise<void>;
  clearUploads: () => void;
  retryFailedCloudinaryUploads: () => Promise<void>; // Retry Cloudinary uploads
  retryFailedRegistrations: () => Promise<void>; // Retry backend registrations only
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

const CLOUDINARY_CONCURRENCY = 5; // Max parallel Cloudinary uploads
const METADATA_BATCH_SIZE = 10; // Register metadata in batches of 10

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Per-session state - reset on each new upload
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRegisterRef = useRef<Array<{ item: UploadItem; request: PhotoRegisterRequest }>>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<UploadItem[]>([]);
  const uploadSessionIdRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isRegisteringRef = useRef<boolean>(false); // Track if metadata registration is in progress
  const registrationQueueRef = useRef<Array<Array<{ item: UploadItem; request: PhotoRegisterRequest }>>>([]); // Queue for batches waiting to be registered

  // Calculate progress from current session items
  const progress = useMemo<UploadProgress>(() => {
    const total = items.length;
    const cloudinaryUploaded = items.filter(i => 
      i.status === 'UPLOADED_TO_CLOUDINARY' ||
      i.status === 'REGISTERING_METADATA' ||
      i.status === 'REGISTERED' ||
      i.status === 'REGISTRATION_FAILED'
    ).length;
    const cloudinaryFailed = items.filter(i => i.status === 'CLOUDINARY_UPLOAD_FAILED').length;
    const cloudinaryUploading = items.filter(i => i.status === 'UPLOADING_TO_CLOUDINARY').length;
    const registered = items.filter(i => i.status === 'REGISTERED').length;
    const registrationFailed = items.filter(i => i.status === 'REGISTRATION_FAILED').length;
    const registering = items.filter(i => i.status === 'REGISTERING_METADATA').length;
    const completed = registered;
    const failed = cloudinaryFailed + registrationFailed;

    return {
      total,
      cloudinaryUploaded,
      cloudinaryFailed,
      cloudinaryUploading,
      registered,
      registrationFailed,
      registering,
      completed,
      failed,
    };
  }, [items]);

  // Update item status
  const updateItemStatus = useCallback((tempId: string, updates: Partial<UploadItem>) => {
    setItems(prev => {
      const itemIndex = prev.findIndex(item => item.tempId === tempId);
      if (itemIndex === -1) {
        return prev;
      }
      const updated = prev.map(item => 
        item.tempId === tempId ? { ...item, ...updates } : item
      );
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  // Register metadata batch to backend - called when batch size reached
  // Returns a Set of cloudinaryPublicIds that were successfully registered
  const registerMetadataBatch = useCallback(async (batch: Array<{ item: UploadItem; request: PhotoRegisterRequest }>): Promise<Set<string>> => {
    if (batch.length === 0) {
      return new Set();
    }

    // If registration is in progress, queue this batch
    if (isRegisteringRef.current) {
      console.log('[UploadContext] Registration already in progress, queuing batch');
      registrationQueueRef.current.push(batch);
      // Don't update status to REGISTERING_METADATA yet - wait until batch is actually processed
      return new Set(); // Return empty set since we can't track results for queued batches
    }

    isRegisteringRef.current = true;
    console.log(`[UploadContext] Registering batch of ${batch.length} photos to backend`);
    const successfullyRegisteredIds = new Set<string>();

    // Update status to REGISTERING_METADATA for all items in batch
    // Only update if not already registered (idempotency check)
    batch.forEach(({ item }) => {
      const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
      if (currentItem && currentItem.status !== 'REGISTERED' && currentItem.status !== 'REGISTERING_METADATA') {
        updateItemStatus(item.tempId, { status: 'REGISTERING_METADATA' });
      }
    });

    try {
      const requests = batch.map(({ request }) => request);
      console.log(`[UploadContext] Sending batch to backend:`, requests.map(r => ({
        cloudinaryPublicId: r.cloudinaryPublicId,
        originalFileName: r.originalFileName,
        sizeBytes: r.sizeBytes,
        contentType: r.contentType
      })));
      const response = await photoApi.bulkRegister(requests);
      console.log(`[UploadContext] Backend response:`, {
        status: response.status,
        statusCode: response.statusCode,
        message: response.message,
        dataLength: response.data?.length,
        fullResponse: response
      });
      
      if (response.status && response.data) {
        const results: BulkRegistrationItemResult[] = response.data;
        
        console.log(`[UploadContext] Processing ${results.length} results for batch of ${batch.length} items`);
        console.log(`[UploadContext] Full results:`, JSON.stringify(results, null, 2));
        
        // Warn if results count doesn't match batch count
        if (results.length !== batch.length) {
          console.warn(`[UploadContext] Mismatch: received ${results.length} results for ${batch.length} items in batch`);
        }
        
        // Create a map of results by cloudinaryPublicId for faster lookup
        const resultsMap = new Map<string, BulkRegistrationItemResult>();
        results.forEach(result => {
          if (result && result.cloudinaryPublicId) {
            resultsMap.set(result.cloudinaryPublicId, result);
          } else {
            console.warn(`[UploadContext] Invalid result (missing cloudinaryPublicId):`, result);
          }
        });
        
        // Process all items in the batch - ensure every item gets a status update
        // First, refresh batch items with latest state from itemsRef
        const refreshedBatch = batch.map(({ item, request }) => {
          const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
          return { 
            item: currentItem || item, // Use current item if found, otherwise use original
            request 
          };
        }).filter(({ item }) => item !== null && item !== undefined); // Remove any null items
        
        const batchPublicIds = refreshedBatch.map(({ request }) => request.cloudinaryPublicId);
        const resultPublicIds = Array.from(resultsMap.keys());
        console.log(`[UploadContext] Batch publicIds (${batchPublicIds.length}):`, batchPublicIds);
        console.log(`[UploadContext] Result publicIds (${resultPublicIds.length}):`, resultPublicIds);
        
        // Track which items we've processed
        const processedPublicIds = new Set<string>();
        
        refreshedBatch.forEach(({ item, request }) => {
          const result = resultsMap.get(request.cloudinaryPublicId);
          const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
          
          if (currentItem) {
            processedPublicIds.add(request.cloudinaryPublicId);
            
            if (result) {
              // We have a result for this item
              console.log(`[UploadContext] Processing result for ${request.cloudinaryPublicId}:`, {
                success: result.success,
                hasPhoto: !!result.photo,
                error: result.error,
                resultKeys: Object.keys(result)
              });
              
              if (result.success) {
                successfullyRegisteredIds.add(request.cloudinaryPublicId);
                updateItemStatus(item.tempId, {
                  status: 'REGISTERED',
                  error: undefined,
                  errorSource: undefined,
                });
                console.log(`[UploadContext] Successfully registered: ${request.cloudinaryPublicId}`);
              } else {
                const errorMessage = result.error || 'Registration failed (no error message provided)';
                updateItemStatus(item.tempId, {
                  status: 'REGISTRATION_FAILED',
                  error: errorMessage,
                  errorSource: 'backend',
                });
                console.error(`[UploadContext] Registration failed for ${request.cloudinaryPublicId}:`, {
                  error: result.error,
                  errorType: typeof result.error,
                  fullResult: result
                });
              }
            } else {
              // No result for this item - this shouldn't happen but handle it
              console.error(`[UploadContext] ❌ No result found for item: ${request.cloudinaryPublicId}`, {
                fileName: item.fileName,
                batchSize: refreshedBatch.length,
                resultsSize: results.length,
                batchPublicIds: batchPublicIds,
                resultPublicIds: resultPublicIds,
                missingFromResults: !resultPublicIds.includes(request.cloudinaryPublicId)
              });
              // Always update status if no result found (don't check status first)
              updateItemStatus(item.tempId, {
                status: 'REGISTRATION_FAILED',
                error: `No result from backend (expected ${refreshedBatch.length} results, got ${results.length})`,
                errorSource: 'backend',
              });
            }
          } else {
            console.warn(`[UploadContext] Item not found in current items: ${request.cloudinaryPublicId}`);
          }
        });
        
        // Check if any results weren't matched to batch items
        resultPublicIds.forEach(resultPublicId => {
          if (!processedPublicIds.has(resultPublicId)) {
            console.warn(`[UploadContext] Result found for item not in batch: ${resultPublicId}`);
          }
        });
        
        // Log any results that don't match batch items (shouldn't happen)
        results.forEach(result => {
          const batchItem = batch.find(({ request }) => request.cloudinaryPublicId === result.cloudinaryPublicId);
          if (!batchItem) {
            console.warn(`[UploadContext] Result found for unknown item: ${result.cloudinaryPublicId}`);
          }
        });
      } else {
        console.error('[UploadContext] Backend response failed:', response);
        batch.forEach(({ item }) => {
          const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
          if (currentItem) {
            updateItemStatus(item.tempId, {
              status: 'REGISTRATION_FAILED',
              error: response.message || 'Registration failed',
              errorSource: 'backend',
            });
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register photos';
      console.error('[UploadContext] Failed to register photo batch:', err);
      
      batch.forEach(({ item }) => {
        const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
        if (currentItem) {
          updateItemStatus(item.tempId, {
            status: 'REGISTRATION_FAILED',
            error: errorMessage,
            errorSource: 'backend',
          });
        }
      });
    } finally {
      isRegisteringRef.current = false;
      
      // Process next queued batch if any
      if (registrationQueueRef.current.length > 0) {
        const nextBatch = registrationQueueRef.current.shift();
        if (nextBatch) {
          console.log(`[UploadContext] Processing queued batch of ${nextBatch.length} photos`);
          // Update status to REGISTERING_METADATA for queued batch items before processing
          // Use the latest item state from itemsRef to ensure we have current data
          nextBatch.forEach(({ item, request }) => {
            const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
            if (currentItem) {
              // Update the batch item reference to use current item state
              const batchIndex = nextBatch.findIndex(b => b.item.tempId === item.tempId);
              if (batchIndex >= 0) {
                nextBatch[batchIndex] = { item: currentItem, request };
              }
              if (currentItem.status !== 'REGISTERED' && currentItem.status !== 'REGISTERING_METADATA') {
                updateItemStatus(item.tempId, { status: 'REGISTERING_METADATA' });
              }
            } else {
              console.warn(`[UploadContext] Queued batch item not found in current items: ${request.cloudinaryPublicId}`);
            }
          });
          // Process next batch asynchronously (don't await to avoid blocking)
          registerMetadataBatch(nextBatch).catch(err => {
            console.error('[UploadContext] Error processing queued batch:', err);
            // On error, mark all items in batch as failed
            nextBatch.forEach(({ item, request }) => {
              const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
              if (currentItem && (currentItem.status === 'REGISTERING_METADATA' || currentItem.status === 'UPLOADED_TO_CLOUDINARY')) {
                updateItemStatus(item.tempId, {
                  status: 'REGISTRATION_FAILED',
                  error: err instanceof Error ? err.message : 'Registration failed',
                  errorSource: 'backend',
                });
              }
            });
          });
        }
      }
    }
    
    return successfullyRegisteredIds;
  }, [updateItemStatus]);

  // Process a single Cloudinary upload - only called once per item
  const processSingleUpload = useCallback(async (item: UploadItem, sessionId: string) => {
    // Guard: Only process if this is still the active session
    if (uploadSessionIdRef.current !== sessionId) {
      return;
    }

    // Guard: Only process if item is still QUEUED and doesn't have cloudinaryPublicId
    const currentItem = itemsRef.current.find(i => i.tempId === item.tempId);
    if (!currentItem || currentItem.status !== 'QUEUED' || currentItem.cloudinaryPublicId) {
      return;
    }

    // Mark as uploading immediately
    activeUploadsRef.current.add(item.tempId);
    updateItemStatus(item.tempId, { status: 'UPLOADING_TO_CLOUDINARY' });

    try {
      // Upload to Cloudinary - ONLY ONCE per item
      const cloudinaryResult = await uploadToCloudinary(item.file);

      // Guard: Check session is still active
      if (uploadSessionIdRef.current !== sessionId) {
        return;
      }

      // Mark as uploaded to Cloudinary
      updateItemStatus(item.tempId, {
        status: 'UPLOADED_TO_CLOUDINARY',
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
        error: undefined,
        errorSource: undefined,
      });

      // Add to pending register queue - use the data we have directly
      const registerRequest: PhotoRegisterRequest = {
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
        originalFileName: item.fileName,
        sizeBytes: cloudinaryResult.bytes,
        contentType: item.file.type || `image/${cloudinaryResult.format}`,
      };

      // Create updated item with Cloudinary data for pending queue
      const updatedItem: UploadItem = {
        ...item,
        status: 'UPLOADED_TO_CLOUDINARY',
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
      };

      // Add to pending register queue - ensure this happens synchronously
      const queueEntry = {
        item: updatedItem,
        request: registerRequest,
      };
      pendingRegisterRef.current.push(queueEntry);
      const pendingCount = pendingRegisterRef.current.length;
      console.log(`[UploadContext] Added to pending queue. Total pending: ${pendingCount}`, {
        publicId: cloudinaryResult.public_id,
        fileName: item.fileName,
        tempId: item.tempId
      });

      // If batch size reached, immediately register metadata (don't wait)
      if (pendingCount >= METADATA_BATCH_SIZE) {
        // Create a copy of the batch without removing from pendingRegisterRef yet
        // Items will be removed only after successful registration
        const batch = pendingRegisterRef.current.slice(0, METADATA_BATCH_SIZE);
        console.log(`[UploadContext] Batch size reached (${METADATA_BATCH_SIZE}), registering immediately. Batch publicIds:`, 
          batch.map(b => b.request.cloudinaryPublicId));
        // Register in background (don't await - let it run async)
        registerMetadataBatch(batch).then((successfullyRegisteredIds) => {
          // Remove only items that were successfully registered
          // Failed items should remain in queue for retry
          if (successfullyRegisteredIds.size > 0) {
            const beforeCount = pendingRegisterRef.current.length;
            pendingRegisterRef.current = pendingRegisterRef.current.filter(
              entry => !successfullyRegisteredIds.has(entry.request.cloudinaryPublicId)
            );
            const afterCount = pendingRegisterRef.current.length;
            console.log(`[UploadContext] Removed ${beforeCount - afterCount} successfully registered items from pending queue. Remaining: ${afterCount}`);
          } else {
            console.log(`[UploadContext] No items to remove - none were successfully registered`);
          }
        }).catch(err => {
          console.error('[UploadContext] Error in background registration:', err);
          // On error, don't remove items - they'll be retried in final flush
        });
      }

    } catch (err) {
      // Guard: Check session is still active
      if (uploadSessionIdRef.current !== sessionId) {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Cloudinary upload failed';
      console.error('Cloudinary upload error:', err);
      
      updateItemStatus(item.tempId, {
        status: 'CLOUDINARY_UPLOAD_FAILED',
        error: errorMessage,
        errorSource: 'cloudinary',
      });
      
      setError(errorMessage);
    } finally {
      activeUploadsRef.current.delete(item.tempId);
    }
  }, [registerMetadataBatch, updateItemStatus]);

  // Process upload queue - ensures each item is processed exactly once
  const processUploadQueue = useCallback(async (sessionId: string) => {
    if (isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    const processNext = async () => {
      if (uploadSessionIdRef.current !== sessionId) {
        isProcessingRef.current = false;
        return;
      }

      if (activeUploadsRef.current.size >= CLOUDINARY_CONCURRENCY) {
        setTimeout(() => {
          if (uploadSessionIdRef.current === sessionId) {
            processNext();
          } else {
            isProcessingRef.current = false;
          }
        }, 100);
        return;
      }

      const currentItems = itemsRef.current;
      const nextItem = currentItems.find(item => 
        item.status === 'QUEUED' && !item.cloudinaryPublicId
      );
      
      if (!nextItem) {
        const allDone = currentItems.every(item => 
          item.cloudinaryPublicId || 
          item.status === 'CLOUDINARY_UPLOAD_FAILED'
        );
        
        if (allDone && activeUploadsRef.current.size === 0) {
          isProcessingRef.current = false;
          return;
        }
        
        setTimeout(() => {
          if (uploadSessionIdRef.current === sessionId) {
            processNext();
          } else {
            isProcessingRef.current = false;
          }
        }, 200);
        return;
      }

      await processSingleUpload(nextItem, sessionId);
      
      setTimeout(() => {
        if (uploadSessionIdRef.current === sessionId) {
          processNext();
        } else {
          isProcessingRef.current = false;
        }
      }, 50);
    };

    processNext();
  }, [processSingleUpload]);

  // Upload photos - creates a fresh session
  const uploadPhotos = useCallback(async (files: File[]): Promise<void> => {
    if (isUploading || isProcessingRef.current) {
      console.warn('Upload already in progress, ignoring new upload request');
      return;
    }

    const sessionId = generateUUID();
    uploadSessionIdRef.current = sessionId;

    // Clear existing state
    setItems([]);
    itemsRef.current = [];
    activeUploadsRef.current.clear();
    pendingRegisterRef.current = [];
    isRegisteringRef.current = false;
    registrationQueueRef.current = [];
    setError(null);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    setIsUploading(true);

    // Create fresh session items
    const newItems: UploadItem[] = files.map((file) => ({
      tempId: generateUUID(),
      fileName: file.name,
      file,
      status: 'QUEUED' as UploadItemStatus,
    }));

    setItems(newItems);
    itemsRef.current = newItems;

    // Start processing upload queue
    processUploadQueue(sessionId);

    // Monitor progress and completion
    return new Promise<void>((resolve) => {
      const progressInterval = setInterval(() => {
        if (uploadSessionIdRef.current !== sessionId) {
          clearInterval(progressInterval);
          resolve();
          return;
        }

        const current = itemsRef.current;
        const allCloudinaryDone = current.every(item => 
          item.cloudinaryPublicId || 
          item.status === 'CLOUDINARY_UPLOAD_FAILED'
        );
        const allRegistered = current.every(item => 
          item.status === 'REGISTERED' || 
          item.status === 'REGISTRATION_FAILED' ||
          item.status === 'CLOUDINARY_UPLOAD_FAILED'
        );

        // Check if all Cloudinary uploads are done
        if (allCloudinaryDone && activeUploadsRef.current.size === 0 && !isProcessingRef.current) {
          console.log(`[UploadContext] All Cloudinary uploads done. Pending registrations: ${pendingRegisterRef.current.length}`);
          console.log(`[UploadContext] Total items: ${current.length}, Uploaded: ${current.filter(i => i.cloudinaryPublicId).length}, Registered: ${current.filter(i => i.status === 'REGISTERED').length}`);
          
          // Final flush of any remaining pending registrations
          (async () => {
            try {
              // Wait a bit to ensure all async operations complete and items are added to pending queue
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Wait for any in-progress registration to complete before final flush
              let waitCount = 0;
              while (isRegisteringRef.current && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
              }
              
              // Also wait for any items that are in REGISTERING_METADATA status
              let registeringItems = current.filter(item => item.status === 'REGISTERING_METADATA');
              let registeringWaitCount = 0;
              while (registeringItems.length > 0 && registeringWaitCount < 50) {
                await new Promise(resolve => setTimeout(resolve, 200));
                registeringItems = itemsRef.current.filter(item => item.status === 'REGISTERING_METADATA');
                registeringWaitCount++;
              }
              
              if (waitCount >= 100 || registeringWaitCount >= 50) {
                console.warn('[UploadContext] Registration took too long, proceeding with final flush anyway');
                // Mark any remaining REGISTERING_METADATA items as failed (they're stuck)
                const stuckItems = itemsRef.current.filter(item => item.status === 'REGISTERING_METADATA');
                if (stuckItems.length > 0) {
                  console.warn(`[UploadContext] Marking ${stuckItems.length} stuck items as failed`);
                  stuckItems.forEach(item => {
                    updateItemStatus(item.tempId, {
                      status: 'REGISTRATION_FAILED',
                      error: 'Registration timeout - no response from backend',
                      errorSource: 'backend',
                    });
                  });
                }
              }
              
              // Check again after waiting
              console.log(`[UploadContext] After wait, pending registrations: ${pendingRegisterRef.current.length}, still registering: ${itemsRef.current.filter(i => i.status === 'REGISTERING_METADATA').length}`);
              
              // CRITICAL: Verify all uploaded items are either registered or in pending queue
              const uploadedButNotRegistered = current.filter(item => 
                item.cloudinaryPublicId && 
                item.status !== 'CLOUDINARY_UPLOAD_FAILED' &&
                item.status !== 'REGISTERED' &&
                item.status !== 'REGISTERING_METADATA'
              );
              
              if (uploadedButNotRegistered.length > 0) {
                console.warn(`[UploadContext] Found ${uploadedButNotRegistered.length} uploaded items not registered or registering:`, 
                  uploadedButNotRegistered.map(i => ({ 
                    fileName: i.fileName, 
                    publicId: i.cloudinaryPublicId, 
                    status: i.status 
                  })));
                
                // Check which ones are missing from pending queue or registration queue
                const pendingPublicIds = new Set(pendingRegisterRef.current.map(p => p.request.cloudinaryPublicId));
                const queuedPublicIds = new Set(
                  registrationQueueRef.current.flatMap(batch => batch.map(b => b.request.cloudinaryPublicId))
                );
                const allQueuedPublicIds = new Set([...pendingPublicIds, ...queuedPublicIds]);
                
                const missingFromQueue = uploadedButNotRegistered.filter(item => 
                  item.cloudinaryPublicId && !allQueuedPublicIds.has(item.cloudinaryPublicId)
                );
                
                if (missingFromQueue.length > 0) {
                  console.error(`[UploadContext] ${missingFromQueue.length} items are missing from pending queue! Adding them.`, 
                    missingFromQueue.map(i => ({ fileName: i.fileName, publicId: i.cloudinaryPublicId })));
                  
                  // Add missing items to pending queue
                  // Note: We need to fetch sizeBytes from Cloudinary API or use file.size as fallback
                  missingFromQueue.forEach(item => {
                    if (item.cloudinaryPublicId && item.cloudinaryUrl) {
                      // Try to get sizeBytes from file, or use a reasonable default
                      // The actual size will be set by Cloudinary, but we need something for the request
                      const registerRequest: PhotoRegisterRequest = {
                        cloudinaryPublicId: item.cloudinaryPublicId,
                        cloudinaryUrl: item.cloudinaryUrl,
                        originalFileName: item.fileName,
                        sizeBytes: item.file.size || 0, // Will be corrected by backend if needed
                        contentType: item.file.type || 'image/jpeg',
                      };
                      
                      // Check if this item is already in pending queue (shouldn't happen, but be safe)
                      const alreadyPending = pendingRegisterRef.current.some(
                        entry => entry.request.cloudinaryPublicId === item.cloudinaryPublicId
                      );
                      
                      if (!alreadyPending) {
                        pendingRegisterRef.current.push({
                          item: item,
                          request: registerRequest,
                        });
                      } else {
                        console.warn(`[UploadContext] Item ${item.cloudinaryPublicId} already in pending queue, skipping`);
                      }
                    }
                  });
                  
                  console.log(`[UploadContext] Added ${missingFromQueue.length} missing items. Total pending now: ${pendingRegisterRef.current.length}`);
                }
              }
              
              // Register any remaining pending items (even if less than batch size)
              // Filter out items that are already registered, but include items that are REGISTERING_METADATA (they might be stuck)
              const unregisteredPending = pendingRegisterRef.current.filter(entry => {
                const currentItem = itemsRef.current.find(i => i.tempId === entry.item.tempId);
                // Include items that are not registered, even if they're in REGISTERING_METADATA (might be stuck)
                return currentItem && currentItem.status !== 'REGISTERED';
              });
              
              if (unregisteredPending.length > 0) {
                console.log(`[UploadContext] Final flush of ${unregisteredPending.length} remaining items`, {
                  totalPending: pendingRegisterRef.current.length,
                  alreadyRegistered: pendingRegisterRef.current.length - unregisteredPending.length,
                  stuckInRegistering: unregisteredPending.filter(e => {
                    const item = itemsRef.current.find(i => i.tempId === e.item.tempId);
                    return item?.status === 'REGISTERING_METADATA';
                  }).length
                });
                console.log(`[UploadContext] Final batch publicIds:`, unregisteredPending.map(b => ({
                  publicId: b.request.cloudinaryPublicId,
                  fileName: b.item.fileName,
                  currentStatus: itemsRef.current.find(i => i.tempId === b.item.tempId)?.status
                })));
                const successfullyRegisteredIds = await registerMetadataBatch(unregisteredPending);
                
                // Remove only successfully registered items from pending queue
                // Failed items should remain for potential retry
                if (successfullyRegisteredIds.size > 0) {
                  const beforeCount = pendingRegisterRef.current.length;
                  pendingRegisterRef.current = pendingRegisterRef.current.filter(
                    entry => !successfullyRegisteredIds.has(entry.request.cloudinaryPublicId)
                  );
                  const afterCount = pendingRegisterRef.current.length;
                  console.log(`[UploadContext] Removed ${beforeCount - afterCount} successfully registered items from pending queue after final flush. Remaining: ${afterCount}`);
                  
                  // Wait a bit for state updates to propagate
                  await new Promise(resolve => setTimeout(resolve, 200));
                  
                  // Verify that successfully registered items have their status updated
                  const registeredPublicIds = Array.from(successfullyRegisteredIds);
                  const itemsStillRegistering = itemsRef.current.filter(item => 
                    item.cloudinaryPublicId && 
                    registeredPublicIds.includes(item.cloudinaryPublicId) &&
                    item.status === 'REGISTERING_METADATA'
                  );
                  
                  if (itemsStillRegistering.length > 0) {
                    console.warn(`[UploadContext] Found ${itemsStillRegistering.length} items that were registered but still show REGISTERING_METADATA. Fixing status.`, 
                      itemsStillRegistering.map(i => ({ fileName: i.fileName, publicId: i.cloudinaryPublicId })));
                    itemsStillRegistering.forEach(item => {
                      updateItemStatus(item.tempId, {
                        status: 'REGISTERED',
                        error: undefined,
                        errorSource: undefined,
                      });
                    });
                    // Wait again for status updates
                    await new Promise(resolve => setTimeout(resolve, 100));
                  }
                } else {
                  console.log(`[UploadContext] No successfully registered items to remove after final flush`);
                }
              } else {
                console.log(`[UploadContext] No pending items to flush (all are already registered or empty)`);
              }
              
              // Wait for any in-flight registrations to complete
              waitCount = 0;
              while (isRegisteringRef.current && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
              }
              
              // Wait for queued batches to process
              waitCount = 0;
              while (registrationQueueRef.current.length > 0 && waitCount < 100) {
                await new Promise(resolve => setTimeout(resolve, 100));
                waitCount++;
              }
              
              // Wait a bit more for all async state updates to complete
              await new Promise(resolve => setTimeout(resolve, 300));
              
              // Final status check - verify all uploaded items are registered
              const finalStatus = itemsRef.current.map(item => ({
                tempId: item.tempId,
                fileName: item.fileName,
                publicId: item.cloudinaryPublicId,
                status: item.status,
              }));
              
              const unregisteredItems = itemsRef.current.filter(item => 
                item.cloudinaryPublicId && 
                item.status !== 'CLOUDINARY_UPLOAD_FAILED' &&
                item.status !== 'REGISTERED' &&
                item.status !== 'REGISTERING_METADATA'
              );
              
              // Check for items that failed registration but are still in pending queue
              const failedButInQueue = unregisteredItems.filter(item => {
                if (item.status === 'REGISTRATION_FAILED') {
                  return pendingRegisterRef.current.some(
                    entry => entry.request.cloudinaryPublicId === item.cloudinaryPublicId
                  );
                }
                return false;
              });
              
              console.log(`[UploadContext] Final status check:`, {
                total: finalStatus.length,
                uploaded: finalStatus.filter(i => i.publicId).length,
                registered: finalStatus.filter(i => i.status === 'REGISTERED').length,
                registering: finalStatus.filter(i => i.status === 'REGISTERING_METADATA').length,
                failed: finalStatus.filter(i => i.status === 'REGISTRATION_FAILED' || i.status === 'CLOUDINARY_UPLOAD_FAILED').length,
                unregistered: unregisteredItems.length,
                failedButInQueue: failedButInQueue.length,
                pendingQueueSize: pendingRegisterRef.current.length,
                unregisteredDetails: unregisteredItems.map(i => ({ 
                  fileName: i.fileName, 
                  publicId: i.cloudinaryPublicId, 
                  status: i.status 
                })),
              });
              
              // If there are failed items still in the queue, try registering them one more time
              if (failedButInQueue.length > 0 && pendingRegisterRef.current.length > 0) {
                console.warn(`[UploadContext] Found ${failedButInQueue.length} failed items still in queue. Attempting final retry.`);
                const retryBatch = pendingRegisterRef.current.slice(0, pendingRegisterRef.current.length);
                const retrySuccessIds = await registerMetadataBatch(retryBatch);
                
                // Remove successfully registered items
                if (retrySuccessIds.size > 0) {
                  pendingRegisterRef.current = pendingRegisterRef.current.filter(
                    entry => !retrySuccessIds.has(entry.request.cloudinaryPublicId)
                  );
                  console.log(`[UploadContext] Retry succeeded for ${retrySuccessIds.size} items`);
                  // Wait for status updates
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
              }
              
              // If there are unregistered items not in queue, this indicates a bug
              const unregisteredNotInQueue = unregisteredItems.filter(item => 
                !pendingRegisterRef.current.some(
                  entry => entry.request.cloudinaryPublicId === item.cloudinaryPublicId
                )
              );
              
              if (unregisteredNotInQueue.length > 0) {
                console.warn(`[UploadContext] Found ${unregisteredNotInQueue.length} unregistered items not in queue. This indicates a bug. Items:`, 
                  unregisteredNotInQueue.map(i => ({ fileName: i.fileName, publicId: i.cloudinaryPublicId, status: i.status })));
              }
              
              // Final safety check: mark any items still stuck in REGISTERING_METADATA as failed
              // But first, double-check against successfully registered IDs to avoid false positives
              const stillRegistering = itemsRef.current.filter(item => {
                if (item.status === 'REGISTERING_METADATA') {
                  // Check if this item was actually successfully registered but status didn't update
                  const wasRegistered = pendingRegisterRef.current.length === 0 && 
                    item.cloudinaryPublicId && 
                    itemsRef.current.some(i => 
                      i.cloudinaryPublicId === item.cloudinaryPublicId && 
                      i.status === 'REGISTERED'
                    );
                  return !wasRegistered;
                }
                return false;
              });
              
              if (stillRegistering.length > 0) {
                console.warn(`[UploadContext] Found ${stillRegistering.length} items still in REGISTERING_METADATA after final flush. Marking as failed.`, 
                  stillRegistering.map(i => ({ fileName: i.fileName, publicId: i.cloudinaryPublicId })));
                stillRegistering.forEach(item => {
                  updateItemStatus(item.tempId, {
                    status: 'REGISTRATION_FAILED',
                    error: 'Registration incomplete - no response received',
                    errorSource: 'backend',
                  });
                });
              }
              
              if (uploadSessionIdRef.current === sessionId) {
                setIsUploading(false);
                resolve();
              }
            } catch (err) {
              console.error('[UploadContext] Error during final flush:', err);
              if (uploadSessionIdRef.current === sessionId) {
                setIsUploading(false);
                resolve();
              }
            }
          })();
          clearInterval(progressInterval);
        }
      }, 500);
    });
  }, [processUploadQueue, registerMetadataBatch, isUploading]);

  // Retry failed Cloudinary uploads - re-uploads the file to Cloudinary
  const retryFailedCloudinaryUploads = useCallback(async () => {
    const failedItems = itemsRef.current.filter(
      item => item.status === 'CLOUDINARY_UPLOAD_FAILED'
    );

    if (failedItems.length === 0) {
      return;
    }

    // Reset status to QUEUED so they can be processed again
    failedItems.forEach(item => {
      updateItemStatus(item.tempId, {
        status: 'QUEUED',
        error: undefined,
        errorSource: undefined,
        cloudinaryPublicId: undefined,
        cloudinaryUrl: undefined,
      });
    });

    // Restart processing if not already running
    if (!isProcessingRef.current && uploadSessionIdRef.current) {
      processUploadQueue(uploadSessionIdRef.current);
    }
  }, [updateItemStatus, processUploadQueue]);

  // Retry failed registrations - only retries metadata, does NOT re-upload to Cloudinary
  const retryFailedRegistrations = useCallback(async () => {
    const failedItems = itemsRef.current.filter(
      item => item.status === 'REGISTRATION_FAILED' && item.cloudinaryPublicId && item.cloudinaryUrl
    );

    if (failedItems.length === 0) {
      return;
    }

    // Build registration requests using existing Cloudinary assets
    const requests: PhotoRegisterRequest[] = failedItems.map(item => ({
      cloudinaryPublicId: item.cloudinaryPublicId!,
      cloudinaryUrl: item.cloudinaryUrl!,
      originalFileName: item.fileName,
      sizeBytes: item.file.size,
      contentType: item.file.type || 'image/jpeg',
    }));

    // Update status to REGISTERING_METADATA
    failedItems.forEach(item => {
      updateItemStatus(item.tempId, { 
        status: 'REGISTERING_METADATA', 
        error: undefined,
        errorSource: undefined,
      });
    });

    try {
      const response = await photoApi.bulkRegister(requests);
      
      if (response.status && response.data) {
        const results: BulkRegistrationItemResult[] = response.data;
        
        results.forEach((result) => {
          const item = failedItems.find(i => i.cloudinaryPublicId === result.cloudinaryPublicId);
          
          if (item) {
            if (result.success) {
              updateItemStatus(item.tempId, {
                status: 'REGISTERED',
                error: undefined,
                errorSource: undefined,
              });
            } else {
              updateItemStatus(item.tempId, {
                status: 'REGISTRATION_FAILED',
                error: result.error || 'Registration failed',
                errorSource: 'backend',
              });
            }
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry registrations';
      console.error('Retry failed:', err);
      
      failedItems.forEach(item => {
        updateItemStatus(item.tempId, {
          status: 'REGISTRATION_FAILED',
          error: errorMessage,
          errorSource: 'backend',
        });
      });
    }
  }, [updateItemStatus]);

  const clearUploads = useCallback(() => {
    uploadSessionIdRef.current = null;
    isProcessingRef.current = false;
    setItems([]);
    itemsRef.current = [];
    setIsUploading(false);
    setError(null);
    activeUploadsRef.current.clear();
    pendingRegisterRef.current = [];
    isRegisteringRef.current = false;
    registrationQueueRef.current = [];
  }, []);

  const value: UploadContextValue = {
    items,
    isUploading,
    error,
    progress,
    uploadPhotos,
    clearUploads,
    retryFailedCloudinaryUploads,
    retryFailedRegistrations,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = (): UploadContextValue => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};
