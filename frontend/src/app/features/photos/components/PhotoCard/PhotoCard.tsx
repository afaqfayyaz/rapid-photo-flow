import React from 'react';
import { Photo } from '../../../../models/photo.model';
import { StatusBadge } from '../../../../shared/components/StatusBadge/StatusBadge';
import styles from './PhotoCard.module.css';

interface PhotoCardProps {
  photo: Photo;
  onReview?: (photo: Photo) => void;
  onDelete?: (photo: Photo) => void;
  isReviewing?: boolean;
  isDeleting?: boolean;
  isSelected?: boolean;
  onSelect?: (photoId: string) => void;
  showCheckbox?: boolean;
  selectMode?: boolean;
  deleteError?: string; // Error message if deletion failed
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ 
  photo, 
  onReview, 
  onDelete, 
  isReviewing, 
  isDeleting,
  isSelected = false,
  onSelect,
  showCheckbox = false,
  selectMode = false,
  deleteError
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const thumbnailUrl = photo.cloudinaryUrl || photo.filePath || photo.thumbnailUrl || `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodeURIComponent(photo.originalFileName.substring(0, 1).toUpperCase())}`;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onSelect) {
      onSelect(photo.id);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectMode && onSelect) {
      // Only toggle selection if clicking the card itself, not buttons/links
      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
        return;
      }
      onSelect(photo.id);
    }
  };

  return (
    <div 
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${selectMode ? styles.selectable : ''}`}
      onClick={handleCardClick}
    >
      {showCheckbox && (
        <div className={styles.checkboxWrapper}>
          <button
            className={`${styles.checkbox} ${isSelected ? styles.checked : ''}`}
            onClick={handleCheckboxClick}
            aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
            type="button"
          >
            {isSelected && (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      )}
      {isSelected && selectMode && (
        <div className={styles.selectedOverlay}>
          <div className={styles.selectedCheckmark}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}
      <div className={styles.thumbnailWrapper}>
        <img
          src={thumbnailUrl}
          alt={photo.originalFileName}
          className={styles.thumbnail}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://via.placeholder.com/400x200/6366f1/ffffff?text=${encodeURIComponent(photo.originalFileName.substring(0, 1).toUpperCase())}`;
          }}
        />
        {!selectMode && (photo.status === 'COMPLETED' || photo.status === 'REVIEWED') && (onReview || onDelete) && (
          <div className={styles.hoverActions} onMouseEnter={(e) => e.stopPropagation()}>
            {onReview && photo.status === 'COMPLETED' && (
              <button
                className={`${styles.actionButton} ${styles.approveButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReview(photo);
                }}
                disabled={isReviewing || isDeleting}
              >
                {isReviewing ? 'Approving...' : '✓ Approve'}
              </button>
            )}
            {onDelete && (
              <button
                className={`${styles.actionButton} ${styles.deleteButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo);
                }}
                disabled={isReviewing || isDeleting}
              >
                {isDeleting ? 'Deleting...' : '✕ Delete'}
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.content}>
        {deleteError && (
          <div className={styles.deleteErrorBadge} title={deleteError}>
            ⚠️ Delete failed
          </div>
        )}
        <div className={styles.header}>
          <h3 className={styles.fileName}>
            {photo.originalFileName}
          </h3>
          <StatusBadge status={photo.status} />
        </div>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Size:</span>
            <span className={styles.value}>
              {((photo.sizeBytes || photo.fileSize || 0) / 1024).toFixed(2)} KB
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Uploaded:</span>
            <span className={styles.value}>{formatDate(photo.createdAt)}</span>
          </div>
          {photo.processedAt && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Processed:</span>
              <span className={styles.value}>{formatDate(photo.processedAt)}</span>
            </div>
          )}
          {photo.errorMessage && (
            <div className={styles.error}>
              <span className={styles.label}>Error:</span>
              <span className={styles.value}>{photo.errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

