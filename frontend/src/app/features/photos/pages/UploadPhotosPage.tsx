import React from 'react';
import { PhotoUpload } from '../components/PhotoUpload/PhotoUpload';
import styles from './UploadPhotosPage.module.css';

export const UploadPhotosPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.background} />
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Upload Photos
          </h1>
          <p className={styles.subtitle}>
            Drag and drop your photos or click to browse
          </p>
        </div>
        <PhotoUpload />
      </div>
    </div>
  );
};

