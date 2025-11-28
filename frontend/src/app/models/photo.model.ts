export enum PhotoStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  FAILED = 'FAILED',
}

export interface Photo {
  id: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  originalFileName: string;
  sizeBytes?: number;
  contentType: string;
  status: PhotoStatus;
  thumbnailUrl?: string;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy fields for backward compatibility
  fileName?: string;
  filePath?: string;
  fileSize?: number;
}

export interface PhotoCreateRequest {
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  filePath: string;
}

export interface PhotoRegisterRequest {
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  originalFileName: string;
  sizeBytes: number;
  contentType: string;
}

export interface PhotoStatusUpdateRequest {
  status: PhotoStatus;
  errorMessage?: string;
}

export enum DeleteMode {
  EXPLICIT = 'EXPLICIT',
  ALL = 'ALL',
  ALL_COMPLETED = 'ALL_COMPLETED',
  ALL_REVIEWED = 'ALL_REVIEWED',
}

export interface BulkDeleteRequest {
  photoIds?: string[];
  mode?: DeleteMode;
  statusFilter?: PhotoStatus[];
}

export interface FailedDeletion {
  photoId: string;
  cloudinaryPublicId: string;
  error: string;
}

export interface BulkDeleteResponse {
  requestedCount: number;
  deletedCount: number;
  cloudinaryFailedCount: number;
  cloudinaryFailed: FailedDeletion[];
}
