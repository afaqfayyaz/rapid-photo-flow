import React, { memo } from 'react';
import { Photo } from '../../../../models/photo.model';
import { PhotoCard } from '../PhotoCard/PhotoCard';
import { LoadingSpinner } from '../../../../shared/components/LoadingSpinner/LoadingSpinner';
import styles from './PhotoGallery.module.css';

interface PhotoGalleryProps {
  photos: Photo[];
  loading?: boolean;
  onReview?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  reviewing?: string | null;
  deleting?: Set<string>;
  selectedPhotoIds?: Set<string>;
  onSelect?: (photoId: string) => void;
  showCheckbox?: boolean;
  selectMode?: boolean;
  failedDeletions?: Map<string, string>; // photoId -> error message
}

const PhotoGalleryComponent: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  loading, 
  onReview,
  onDelete,
  reviewing,
  deleting,
  selectedPhotoIds = new Set(),
  onSelect,
  showCheckbox = false,
  selectMode = false,
  failedDeletions = new Map()
}) => {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (photos.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🖼️</div>
        <h3 className={styles.emptyTitle}>No Photos Found</h3>
        <p className={styles.emptyMessage}>
          There are no photos to display. Upload photos to get started.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      {photos.map((photo) => (
        <PhotoCard 
          key={photo.id} 
          photo={photo} 
          onReview={onReview}
          onDelete={onDelete}
          isReviewing={reviewing === photo.id}
          isDeleting={deleting?.has(photo.id) || false}
          isSelected={selectedPhotoIds.has(photo.id)}
          onSelect={onSelect}
          showCheckbox={showCheckbox}
          selectMode={selectMode}
          deleteError={failedDeletions.get(photo.id)}
        />
      ))}
    </div>
  );
};

export const PhotoGallery = memo(PhotoGalleryComponent);

