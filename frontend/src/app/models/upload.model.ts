export type UploadItemStatus =
  | 'QUEUED'
  | 'UPLOADING_TO_CLOUDINARY'
  | 'UPLOADED_TO_CLOUDINARY' // Successfully uploaded to Cloudinary
  | 'CLOUDINARY_UPLOAD_FAILED' // Failed to upload to Cloudinary
  | 'REGISTERING_METADATA'
  | 'REGISTERED' // Successfully registered in backend
  | 'REGISTRATION_FAILED'; // Failed to register in backend (but uploaded to Cloudinary)

export interface UploadItem {
  tempId: string; // UUID
  fileName: string;
  file: File;
  status: UploadItemStatus;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  error?: string;
  errorSource?: 'cloudinary' | 'backend'; // Track where the error came from
}

export interface BulkRegistrationItemResult {
  cloudinaryPublicId: string;
  success: boolean;
  photo?: {
    id: string;
    status: string;
    [key: string]: any;
  };
  error?: string;
}
