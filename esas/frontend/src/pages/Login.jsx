import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, LogIn, User, ShieldCheck } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [username, setUsername] = useState('lavanya');
  const [password, setPassword] = useState('CSE101');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login(username.trim(), password);

      localStorage.removeItem('esas_token');
      localStorage.removeItem('esas_refresh');
      localStorage.removeItem('esas_user');
      sessionStorage.removeItem('esas_token');
      sessionStorage.removeItem('esas_refresh');
      sessionStorage.removeItem('esas_user');

      localStorage.setItem('esas_token', res.data.access);
      localStorage.setItem('esas_refresh', res.data.refresh);
      localStorage.setItem('esas_user', JSON.stringify(res.data.user));

      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!err.response) {
        // Fallback for admin credentials if network/backend is unreachable
        if (username.trim() === 'lavanya' && password === 'CSE101') {
          const fallbackUser = {
            id: 20,
            username: 'lavanya',
            email: 'lavanya@esas.com',
            first_name: 'Lavanya',
            last_name: '',
            role: 'ADMIN',
          };
          localStorage.setItem('esas_token', 'offline-admin-token-' + Date.now());
          localStorage.setItem('esas_refresh', 'offline-refresh-token');
          localStorage.setItem('esas_user', JSON.stringify(fallbackUser));
          navigate('/dashboard');
          return;
        }
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card fade-in">
        {/* Header */}
        <div className="auth-card-header" style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
          }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <h2>Admin Login</h2>
          <p>Exam Seat Allotment System</p>
          <div style={{
            marginTop: '12px',
            padding: '6px 12px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '6px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)'
          }}>
            <span>Default:</span>
            <strong style={{ color: 'var(--accent)' }}>lavanya</strong>
            <span>/</span>
            <strong style={{ color: 'var(--accent)' }}>CSE101</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="auth-error shake">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-username">Username</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                id="login-username"
                type="text"
                className="auth-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                required
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
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
        </form>

        {/* Footer */}
        <p className="auth-footer-text" style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          Authorized personnel only
        </p>
      </div>
    </AuthLayout>
  );
}
