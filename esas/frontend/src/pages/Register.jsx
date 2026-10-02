import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  UserPlus, ArrowLeft, Check, X, Shield
} from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
    setError('');
  };

  // Password strength checks
  const passwordChecks = useMemo(() => {
    const pw = formData.password;
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/~`]/.test(pw),
    };
  }, [formData.password]);

  const passwordStrength = useMemo(() => {
    const passed = Object.values(passwordChecks).filter(Boolean).length;
    if (passed <= 1) return { level: 0, label: '', color: '' };
    if (passed <= 2) return { level: 1, label: 'Weak', color: 'var(--error)' };
    if (passed <= 3) return { level: 2, label: 'Fair', color: 'var(--warning)' };
    if (passed <= 4) return { level: 3, label: 'Good', color: 'var(--accent)' };
    return { level: 4, label: 'Strong', color: 'var(--success)' };
  }, [passwordChecks]);

  const allPasswordReqsMet = Object.values(passwordChecks).every(Boolean);

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Please enter your full name.';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Please enter your mobile number.';
    } else {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.phone = 'Please enter a valid mobile number (10-15 digits).';
      }
    }

    if (!formData.password) {
      errors.password = 'Please enter a password.';
    } else if (!allPasswordReqsMet) {
      errors.password = 'Password does not meet all requirements.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreedTerms) {
      errors.terms = 'You must agree to the Terms & Conditions.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }
    return true;
  };

  const isFormValid = useMemo(() => {
    return (
      formData.fullName.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.phone.replace(/\D/g, '').length >= 10 &&
      allPasswordReqsMet &&
      formData.password === formData.confirmPassword &&
      formData.confirmPassword.length > 0 &&
      agreedTerms
    );
  }, [formData, agreedTerms, allPasswordReqsMet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      const formCard = document.querySelector('.auth-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        password: formData.password,
      });

      setSuccess(true);

      // Auto-login if tokens are returned
      if (res.data.access) {
        localStorage.removeItem('esas_token');
        localStorage.removeItem('esas_refresh');
        localStorage.removeItem('esas_user');
        sessionStorage.removeItem('esas_token');
        sessionStorage.removeItem('esas_refresh');
        sessionStorage.removeItem('esas_user');

        localStorage.setItem('esas_token', res.data.access);
        localStorage.setItem('esas_refresh', res.data.refresh);
        localStorage.setItem('esas_user', JSON.stringify(res.data.user));

        const role = res.data.user?.role || 'USER';
        let target = '/dashboard';
        if (role === 'ADMIN') target = '/admin/dashboard';
        else if (role === 'STAFF') target = '/staff/dashboard';
        else if (role === 'STUDENT') target = '/student/dashboard';

        setTimeout(() => {
          navigate(target);
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        // Map backend field errors to frontend field names
        const backendErrors = err.response.data.errors;
        const mapped = {};
        if (backendErrors.email) mapped.email = Array.isArray(backendErrors.email) ? backendErrors.email[0] : backendErrors.email;
        if (backendErrors.phone) mapped.phone = Array.isArray(backendErrors.phone) ? backendErrors.phone[0] : backendErrors.phone;
        if (backendErrors.password) mapped.password = Array.isArray(backendErrors.password) ? backendErrors.password[0] : backendErrors.password;
        if (backendErrors.full_name) mapped.fullName = Array.isArray(backendErrors.full_name) ? backendErrors.full_name[0] : backendErrors.full_name;
        setFieldErrors(mapped);

        // Always show the first error in the top error alert banner as well!
        const firstErr = Object.values(mapped)[0] || err.response?.data?.error || 'Registration failed. Please check your information.';
        setError(firstErr);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (!err.response) {
        setError('Cannot connect to server. Please ensure the backend server is running.');
      } else {
        setError('Registration failed. Please try again.');
      }

      const formCard = document.querySelector('.auth-card');
      if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="auth-card fade-in" style={{ textAlign: 'center' }}>
          <div className="auth-success-icon">
            <Check size={32} />
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            marginTop: '20px',
          }}>
            Account Created!
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}>
            Your account has been created successfully. Redirecting you now...
          </p>
          <div className="auth-progress-bar">
            <div className="auth-progress-fill" />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card fade-in">
        {/* Navigation tabs */}
        <div className="auth-tabs">
          <Link to="/login" className="auth-tab">Sign In</Link>
          <button className="auth-tab active">Register</button>
        </div>

        {/* Header */}
        <div className="auth-card-header">
          <h2>Create Your Account</h2>
          <p>Register to get started.</p>
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

          {/* Full Name */}
          <div className={`auth-field ${fieldErrors.fullName ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="register-name">Full Name</label>
            <div className="auth-input-wrap">
              <User size={16} className="auth-input-icon" />
              <input
                id="register-name"
                type="text"
                className="auth-input"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                required
                autoFocus
                autoComplete="name"
              />
            </div>
            {fieldErrors.fullName && <p className="auth-field-error">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div className={`auth-field ${fieldErrors.email ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="register-email">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="register-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
            {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
          </div>

          {/* Phone */}
          <div className={`auth-field ${fieldErrors.phone ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="register-phone">Mobile Number</label>
            <div className="auth-input-wrap">
              <Phone size={16} className="auth-input-icon" />
              <input
                id="register-phone"
                type="tel"
                className="auth-input"
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            {fieldErrors.phone && <p className="auth-field-error">{fieldErrors.phone}</p>}
          </div>

          {/* Password */}
          <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="register-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                required
                autoComplete="new-password"
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
            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}

            {/* Password strength bar */}
            {formData.password.length > 0 && (
              <div className="auth-password-strength fade-in">
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`auth-strength-segment ${i <= passwordStrength.level ? 'filled' : ''}`}
                      style={{ backgroundColor: i <= passwordStrength.level ? passwordStrength.color : undefined }}
                    />
                  ))}
                </div>
                {passwordStrength.label && (
                  <span className="auth-strength-label" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </span>
                )}
              </div>
            )}

            {/* Password requirements */}
            {formData.password.length > 0 && (
              <ul className="auth-password-reqs fade-in">
                {[
                  { key: 'length', label: 'Minimum 8 characters' },
                  { key: 'uppercase', label: 'At least one uppercase letter' },
                  { key: 'lowercase', label: 'At least one lowercase letter' },
                  { key: 'number', label: 'At least one number' },
                  { key: 'special', label: 'At least one special character' },
                ].map(({ key, label }) => (
                  <li key={key} className={`auth-req ${passwordChecks[key] ? 'met' : ''}`}>
                    {passwordChecks[key] ? (
                      <Check size={13} className="auth-req-icon met" />
                    ) : (
                      <X size={13} className="auth-req-icon" />
                    )}
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className={`auth-field ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
            <label className="auth-label" htmlFor="register-confirm">Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="register-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-input-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="auth-field-error">{fieldErrors.confirmPassword}</p>}
            {/* Match indicator */}
            {formData.confirmPassword && formData.password && formData.password === formData.confirmPassword && (
              <p className="auth-field-success fade-in">
                <Check size={13} /> Passwords match
              </p>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className={`auth-terms ${fieldErrors.terms ? 'has-error' : ''}`}>
            <label className="auth-checkbox-label" htmlFor="register-terms">
              <input
                id="register-terms"
                type="checkbox"
                className="auth-checkbox"
                checked={agreedTerms}
                onChange={(e) => { setAgreedTerms(e.target.checked); setFieldErrors(prev => ({...prev, terms: ''})); }}
              />
              <span className="auth-checkbox-custom" />
              <span>
                I agree to the{' '}
                <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>Terms & Conditions</a>
                {' '}and{' '}
                <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              </span>
            </label>
            {fieldErrors.terms && <p className="auth-field-error">{fieldErrors.terms}</p>}
          </div>

          {/* Submit button */}
          <button
            id="register-submit"
            type="submit"
            className={`auth-btn auth-btn-primary ${loading ? 'loading' : ''} ${!isFormValid ? 'disabled-visual' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <UserPlus size={18} />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Login link */}
        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            Sign In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
