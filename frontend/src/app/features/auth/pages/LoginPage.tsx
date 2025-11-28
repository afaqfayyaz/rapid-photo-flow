import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../../shared/components/Logo/Logo';
import { Button } from '../../../shared/components/Button/Button';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simple mock authentication
    // In a real app, this would call an API
    setTimeout(() => {
      if (email && password) {
        // Store auth state (simple localStorage for demo)
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        navigate('/');
        window.location.reload();
      } else {
        setError('Please enter both email and password');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.logoContainer}>
          <Logo size="large" showText={true} />
        </div>
        
        <h2 className={styles.title}>Welcome Back</h2>
        <p className={styles.subtitle}>Sign in to continue to RapidPhotoFlow</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <div className={styles.demoNote}>
            <p>💡 Demo Mode: Enter any email and password to continue</p>
          </div>
          
          <div className={styles.divider}>
            <span>or</span>
          </div>
          
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setEmail('demo@rapidphotoflow.com');
              setPassword('demo123');
            }}
            disabled={loading}
          >
            Use Demo Credentials
          </Button>
        </form>
      </div>
    </div>
  );
};

