import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, ArrowLeft, Send, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function ForgotPassword() {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'success'
  const [identifier, setIdentifier] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setMessage('');

    if (!identifier.trim()) {
      setError('Please enter your username or email.');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(identifier.trim());
      setMessage(res.data?.message || 'If an account exists with that username/email, a reset code has been generated.');
      if (res.data?.dev_code) {
        setResetCode(res.data.dev_code);
      }
      setStep('reset');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setMessage('If an account exists with that username/email, a reset code has been generated.');
        setStep('reset');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    if (!resetCode.trim()) {
      setError('Please enter the reset code.');
      return;
    }
    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(identifier.trim(), resetCode.trim(), newPassword);
      setStep('success');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError(err.response?.data?.error || err.response?.data?.detail || 'Invalid or expired reset code. Please try again.');
      }
      const formCard = document.querySelector('.auth-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-card fade-in">
        {/* Tabs */}
        <div className="auth-tabs">
          <Link to="/login" className="auth-tab">Sign In</Link>
          <Link to="/register" className="auth-tab">Register</Link>
          <button className="auth-tab active">Forgot Password</button>
        </div>

        {step === 'request' && (
          <>
            <div className="auth-card-header">
              <h2>Forgot Password?</h2>
              <p>Enter your username or email to receive a reset code</p>
            </div>

            <form onSubmit={handleRequestReset} className="auth-form">
              {error && (
                <div className="auth-error shake">
                  <span>{error}</span>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Username or Email</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="forgot-identifier"
                    type="text"
                    className="auth-input"
                    placeholder="Enter your username or email"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                    required
                    autoFocus
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <button
                id="forgot-submit"
                type="submit"
                className="auth-btn auth-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    <Send size={18} />
                    Send Reset Code
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer-text">
              <Link to="/login" className="auth-link">
                <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Back to Sign In
              </Link>
            </p>
          </>
        )}

        {step === 'reset' && (
          <>
            <div className="auth-card-header">
              <h2>Reset Password</h2>
              <p>Enter the reset code and your new password</p>
            </div>

            {message && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--success-light)',
                marginBottom: '16px',
              }}>
                {message}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="auth-form">
              {error && (
                <div className="auth-error shake">
                  <span>{error}</span>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Reset Code</label>
                <div className="auth-input-wrap">
                  <KeyRound size={16} className="auth-input-icon" />
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    className="auth-input"
                    placeholder="Enter 6-digit reset code"
                    value={resetCode}
                    onChange={(e) => { setResetCode(e.target.value); setError(''); }}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">New Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    required
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm New Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="reset-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    required
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </div>
              </div>

              <button
                id="reset-submit"
                type="submit"
                className="auth-btn auth-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                ) : (
                  <>
                    <Lock size={18} />
                    Reset Password
                  </>
                )}
              </button>
            </form>

            <p className="auth-footer-text">
              <button
                onClick={() => { setStep('request'); setError(''); setMessage(''); }}
                className="auth-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Try a different email
              </button>
            </p>
          </>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2
              size={56}
              style={{
                color: 'var(--success)',
                marginBottom: '16px',
              }}
            />
            <h2 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '8px',
            }}>
              Password Reset Successful!
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginBottom: '28px',
              lineHeight: 1.6,
            }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              to="/login"
              className="auth-btn auth-btn-primary"
              style={{ display: 'inline-flex', textDecoration: 'none' }}
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
