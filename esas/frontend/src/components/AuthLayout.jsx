import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * AuthLayout — shared layout wrapper for Login, Register, ForgotPassword pages.
 * Renders the animated background, logo header, and centers the auth card.
 */
export default function AuthLayout({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('esas_theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-bg-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
      </div>

      {/* Floating grid overlay */}
      <div className="auth-grid-overlay" />

      <div className="auth-container">
        {/* Brand header */}
        <div className="auth-brand fade-in">
          <Link to="/" className="auth-brand-link">
            <img src="/logo.png" alt="ESAS Logo" className="auth-brand-logo" />
            <div className="auth-brand-text">
              <span className="auth-brand-name">ESAS</span>
              <span className="auth-brand-tagline">Smart Exam Seat Allotment System</span>
            </div>
          </Link>
        </div>

        {/* Auth card slot */}
        {children}

        {/* Footer */}
        <p className="auth-copyright fade-in">
          © {new Date().getFullYear()} ESAS · All rights reserved
        </p>
      </div>
    </div>
  );
}
