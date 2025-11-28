import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { UploadPhotosPage } from './features/photos/pages/UploadPhotosPage';
import { ProcessingQueuePage } from './features/processing/pages/ProcessingQueuePage';
import { ReviewPhotosPage } from './features/photos/pages/ReviewPhotosPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { Logo } from './shared/components/Logo/Logo';
import { UploadProvider } from './shared/contexts/UploadContext';
import styles from './app-routing.module.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(auth === 'true');
    setLoading(false);
    
    if (auth !== 'true') {
      navigate('/login');
    }
  }, [navigate]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : null;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const location = useLocation();

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    const email = localStorage.getItem('userEmail');
    setIsAuthenticated(auth === 'true');
    setUserEmail(email || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
  };

  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className={styles.app}>
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <Link to="/" className={styles.logoLink}>
            <Logo size="medium" showText={true} />
          </Link>
          <div className={styles.navRight}>
            <div className={styles.navLinks}>
              <Link 
                to="/" 
                className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
              >
                Upload
              </Link>
              <Link 
                to="/processing" 
                className={`${styles.navLink} ${isActive('/processing') ? styles.active : ''}`}
              >
                Processing Queue
              </Link>
              <Link 
                to="/review" 
                className={`${styles.navLink} ${isActive('/review') ? styles.active : ''}`}
              >
                Review
              </Link>
            </div>
            <div className={styles.userSection}>
              <div className={styles.profileBadge}>
                <div className={styles.avatar}>
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className={styles.userEmail}>{userEmail}</span>
              </div>
              <button
                className={styles.logoutButton}
                onClick={handleLogout}
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <UploadProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AppLayout>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <UploadPhotosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/processing"
                  element={
                    <ProtectedRoute>
                      <ProcessingQueuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/review"
                  element={
                    <ProtectedRoute>
                      <ReviewPhotosPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AppLayout>
          }
        />
      </Routes>
      </UploadProvider>
    </BrowserRouter>
  );
};

