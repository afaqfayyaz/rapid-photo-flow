import { Cloudinary } from '@cloudinary/url-gen';

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dcxothmph';
// Using unsigned upload - you need to create an unsigned upload preset in Cloudinary dashboard
// Settings > Upload > Upload presets > Add upload preset (set to unsigned)
// For now, we'll try without preset first (may require API key/secret)
const CLOUDINARY_UPLOAD_PRESET = 'rapidphotoflow_unsigned'; // Optional: create this preset in Cloudinary
const CLOUDINARY_API_KEY = '465111424697416'; // Public API key (safe to expose)

// Initialize Cloudinary instance for URL generation
export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: CLOUDINARY_CLOUD_NAME,
  },
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Upload a file directly to Cloudinary from the frontend
 * Uses unsigned upload preset for security (no API secret exposed)
 */
export const uploadToCloudinary = async (file: File): Promise<CloudinaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'rapidphotoflow');
  
  // Generate a unique public_id with random component to prevent collisions
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9); // 7 random chars
  const sanitizedName = file.name.replace(/\s/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
  // Don't include folder in public_id since we're using folder parameter
  const publicId = `${timestamp}-${randomSuffix}-${sanitizedName}`;
  formData.append('public_id', publicId);
  
  // Try with unsigned upload preset first (if configured)
  if (CLOUDINARY_UPLOAD_PRESET) {
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  } else {
    // If no preset, we need API key (but this requires signed uploads or preset)
    formData.append('api_key', CLOUDINARY_API_KEY);
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
      const errorMessage = errorData.error?.message || `Upload failed: ${response.statusText}`;
      
      console.error('Cloudinary upload error:', errorMessage);
      throw new Error(`Cloudinary upload failed: ${errorMessage}. Please create an unsigned upload preset in Cloudinary dashboard.`);
    }

    const data = await response.json();
    
    return {
      public_id: data.public_id,
      secure_url: data.secure_url,
      url: data.url,
      width: data.width,
      height: data.height,
      bytes: data.bytes,
      format: data.format,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

