import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const sizeClasses = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  return (
    <div className={`${styles.logo} ${sizeClasses[size]}`}>
      <div className={styles.icon}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.svg}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="cameraGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="lensGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          
          {/* Camera body with shadow */}
          <rect x="12" y="20" width="40" height="28" rx="4" fill="url(#cameraGradient)" />
          <rect x="12" y="20" width="40" height="28" rx="4" fill="url(#cameraGradient)" opacity="0.8" />
          
          {/* Camera lens with depth */}
          <circle cx="32" cy="34" r="10" fill="url(#lensGradient)" />
          <circle cx="32" cy="34" r="8" fill="#818CF8" opacity="0.6" />
          <circle cx="32" cy="34" r="6" fill="#A5B4FC" />
          <circle cx="30" cy="32" r="2" fill="#E0E7FF" />
          
          {/* Flash with gradient */}
          <rect x="20" y="12" width="8" height="6" rx="2" fill="url(#accentGradient)" />
          
          {/* Photo frame effect */}
          <path
            d="M16 24 L16 16 L48 16 L48 24"
            stroke="url(#accentGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          
          {/* Plus sign for upload with gradient */}
          <path
            d="M52 20 L52 28 M48 24 L56 24"
            stroke="url(#accentGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          
          {/* Shine effect */}
          <path
            d="M16 20 Q32 18 48 20"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
      {showText && <span className={styles.text}>RapidPhotoFlow</span>}
    </div>
  );
};

