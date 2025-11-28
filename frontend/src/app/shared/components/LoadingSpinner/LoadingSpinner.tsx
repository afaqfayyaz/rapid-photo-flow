import React from 'react';
import styles from './LoadingSpinner.module.css';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
    </div>
  );
};

