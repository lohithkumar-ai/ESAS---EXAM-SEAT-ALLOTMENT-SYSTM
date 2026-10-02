import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const errors = {};
    if (!username.trim()) {
      errors.username = 'Please enter your email or username.';
    }
    if (!password) {
      errors.password = 'Please enter your password.';
    } else if (password.length < 4) {
      errors.password = 'Password is too short.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await authAPI.login(username.trim(), password);
      // Clear existing auth state to avoid stale session
      localStorage.removeItem('esas_token');
      localStorage.removeItem('esas_refresh');
      localStorage.removeItem('esas_user');
      sessionStorage.removeItem('esas_token');
      sessionStorage.removeItem('esas_refresh');
      sessionStorage.removeItem('esas_user');

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('esas_token', res.data.access);
      storage.setItem('esas_refresh', res.data.refresh);
      storage.setItem('esas_user', JSON.stringify(res.data.user));

      // Role-based redirect
      const role = res.data.user?.role || 'USER';
      switch (role) {
        case 'ADMIN':
          navigate('/admin/dashboard');
          break;
        case 'STAFF':
          navigate('/staff/dashboard');
          break;
        case 'STUDENT':
          navigate('/student/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError(err.response?.data?.error || 'Invalid email/username or password. Please try again.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (!err.response) {
        setError('Cannot connect to server. Please ensure the backend server is running.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card fade-in">
        {/* Navigation tabs */}
        <div className="auth-tabs">
          <button className="auth-tab active">Sign In</button>
          <Link to="/register" className="auth-tab">Register</Link>
        </div>

        {/* Header */}
        <div className="auth-card-header">
          <h2>Welcome Back</h2>
          <p>Sign in to continue to your account.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Global error */}
          {error && (
            <div className="auth-error shake">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Email / Username field */}
          <div className={`auth-field ${fieldErrors.username ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="login-username">Email or Username</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="login-username"
                type="text"
                className="auth-input"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setFieldErrors(prev => ({...prev, username: ''})); setError(''); }}
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                aria-describedby={fieldErrors.username ? 'login-username-error' : undefined}
              />
            </div>
            {fieldErrors.username && (
              <p className="auth-field-error" id="login-username-error">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password field */}
          <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({...prev, password: ''})); setError(''); }}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="auth-field-error" id="login-password-error">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember me + Forgot password */}
          <div className="auth-row">
            <label className="auth-checkbox-label" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-checkbox-custom" />
              Remember me
            </label>
            <Link to="/forgot-password" className="auth-link-subtle">
              Forgot Password?
            </Link>
          </div>

          {/* Login button */}
          <button
            id="login-submit"
            type="submit"
            className={`auth-btn auth-btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span>OR</span>
          </div>

          {/* Google Auth (UI only — no fake functionality) */}
          <button type="button" className="auth-btn auth-btn-social" disabled title="Google authentication is not configured">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {/* Register link */}
        <p className="auth-footer-text">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Create Account <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
