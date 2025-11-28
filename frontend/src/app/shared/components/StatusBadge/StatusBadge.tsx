import React from 'react';
import { PhotoStatus } from '../../../models/photo.model';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: PhotoStatus;
}

const statusConfig: Record<PhotoStatus, { label: string; className: string }> = {
  [PhotoStatus.UPLOADED]: { 
    label: 'Uploaded', 
    className: styles.uploaded
  },
  [PhotoStatus.PROCESSING]: { 
    label: 'Processing', 
    className: styles.processing
  },
  [PhotoStatus.COMPLETED]: { 
    label: 'Completed', 
    className: styles.completed
  },
  [PhotoStatus.REVIEWED]: { 
    label: 'Approved', 
    className: styles.reviewed
  },
  [PhotoStatus.FAILED]: { 
    label: 'Failed', 
    className: styles.failed
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <span className={`${styles.badge} ${config.className}`}>
      {config.label}
    </span>
  );
};

