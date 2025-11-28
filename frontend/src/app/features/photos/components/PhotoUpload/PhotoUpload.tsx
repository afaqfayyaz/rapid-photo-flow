import React, { useState, useRef } from 'react';
import { useUpload } from '../../../../shared/contexts/UploadContext';
import styles from './PhotoUpload.module.css';

export const PhotoUpload: React.FC = () => {
  const { uploadPhotos, isUploading } = useUpload();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    try {
      await uploadPhotos(selectedFiles);
      setSelectedFiles([]);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isUploading}
        style={{ 
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1px',
          height: '1px',
          opacity: '0',
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1
        }}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div
        onClick={handleClick}
        className={styles.uploadArea}
      >
        {selectedFiles.length === 0 && (
          <svg 
            className={styles.emptyIllustration}
            viewBox="0 0 240 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="illustrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#A855F7" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Photo frames with depth */}
            <rect x="25" y="25" width="55" height="45" rx="6" fill="url(#illustrationGradient)" stroke="url(#strokeGradient)" strokeWidth="2" strokeOpacity="0.4" filter="url(#glow)"/>
            <rect x="30" y="30" width="45" height="35" rx="4" fill="rgba(255, 255, 255, 0.1)"/>
            
            <rect x="85" y="35" width="55" height="45" rx="6" fill="url(#illustrationGradient)" stroke="url(#strokeGradient)" strokeWidth="2" strokeOpacity="0.4" filter="url(#glow)"/>
            <rect x="90" y="40" width="45" height="35" rx="4" fill="rgba(255, 255, 255, 0.1)"/>
            
            <rect x="145" y="30" width="55" height="45" rx="6" fill="url(#illustrationGradient)" stroke="url(#strokeGradient)" strokeWidth="2" strokeOpacity="0.4" filter="url(#glow)"/>
            <rect x="150" y="35" width="45" height="35" rx="4" fill="rgba(255, 255, 255, 0.1)"/>
            
            {/* Enhanced cloud */}
            <path
              d="M70 85C64 85 60 81 60 76C60 71 64 67 70 67C71 64 74 62 78 62C83 62 87 66 87 71C87 72 86.5 73 86 74C89 74 92 77 92 81C92 85 89 88 85 88H70Z"
              fill="url(#illustrationGradient)"
              stroke="url(#strokeGradient)"
              strokeWidth="2"
              strokeOpacity="0.5"
              filter="url(#glow)"
            />
            {/* Enhanced arrow */}
            <path
              d="M120 80V90M120 80L115 75M120 80L125 75"
              stroke="url(#strokeGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.6"
              filter="url(#glow)"
            />
          </svg>
        )}
        <div className={styles.iconWrapper}>
          <div className={styles.iconGlow} />
          <svg 
            className={`${styles.uploadIcon} ${styles.iconFloat}`}
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
            {/* Cloud shape */}
            <path
              d="M25 50C18.3726 50 13 44.6274 13 38C13 31.3726 18.3726 26 25 26C26.5 22 30 19 34 19C40.6274 19 46 24.3726 46 31C46 32.5 45.5 34 44.5 35.5C48.5 36 52 39.5 52 44C52 49 48 53 43 53H25Z"
              fill="url(#cloudGradient)"
              opacity="0.15"
            />
            <path
              d="M25 50C18.3726 50 13 44.6274 13 38C13 31.3726 18.3726 26 25 26C26.5 22 30 19 34 19C40.6274 19 46 24.3726 46 31C46 32.5 45.5 34 44.5 35.5C48.5 36 52 39.5 52 44C52 49 48 53 43 53H25Z"
              stroke="url(#cloudGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#cloudShadow)"
            />
            {/* Upload arrow */}
            <path
              d="M40 35V45M40 35L35 30M40 35L45 30"
              stroke="url(#cloudGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cloudShadow)"
            />
            <defs>
              <filter id="cloudShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>
        <div className={styles.uploadText}>
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file(s) selected`
            : 'Choose files or drag and drop'}
        </div>
        <div className={styles.uploadHint}>
          PNG, JPG, GIF up to 10MB
        </div>

        {selectedFiles.length > 0 && (
          <div className={styles.fileList}>
            <h3 className={styles.fileListTitle}>Selected Files:</h3>
            <ul className={styles.fileListItems}>
              {selectedFiles.map((file, index) => (
                <li key={index} className={styles.fileListItem}>
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}


        <div className={styles.buttonContainer}>
          <button
            className={styles.uploadButton}
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading 
              ? 'Uploading...'
              : `Upload ${selectedFiles.length} Photo(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

