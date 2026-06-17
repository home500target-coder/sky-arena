import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { Mail, Lock, Eye, EyeOff, ShieldAlert, KeyRound, RefreshCw } from 'lucide-react';
export default function LoginView({ onSwitchView }) {
  const { loginUser } = useDB();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Invalid email address format';
    }
    if (!password) {
      errs.password = 'Password is required';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoginError('');
    setSubmitting(true);
    try {
      const res = await loginUser(email, password);
      if (!res.success) {
        setLoginError(res.message);
      } else {
        alert(res.message);
      }
    } catch (error) {
      setLoginError('Server connection failed.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleTestLogin = async () => {
    setSubmitting(true);
    setErrors({});
    setLoginError('');
    try {
      const res = await loginUser('zero@gmail.com', 'password123');
      if (!res.success) {
        setLoginError(res.message);
      } else {
        alert(res.message);
      }
    } catch (error) {
      setLoginError('Server connection failed.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="auth-wrapper">
      <div className="auth-card animated-scale-up">
        <div className="auth-logo-section">
          <div className="auth-logo-circle">
            <KeyRound size={32} className="highlight-gold" />
          </div>
          <h2>SKYARENA</h2>
          <p>Esports Escrow Tournament Platform</p>
        </div>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          {loginError && (
            <div className="auth-alert-error">
              <ShieldAlert size={16} />
              <span>{loginError}</span>
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon-wrapper">
              <Mail size={16} className="input-icon-left" />
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: null })); }}
                style={{ borderColor: errors.email ? '#ef4444' : 'var(--color-border)' }}
              />
            </div>
            {errors.email && <span className="custom-input-error">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon-wrapper">
              <Lock size={16} className="input-icon-left" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter password" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: null })); }}
                style={{ borderColor: errors.password ? '#ef4444' : 'var(--color-border)' }}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="custom-input-error">{errors.password}</span>}
          </div>
          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw className="spin-animate" size={16} /> Logging In...
              </span>
            ) : (
              'Log In Account'
            )}
          </button>
          <button 
            type="button" 
            className="auth-submit-btn" 
            onClick={handleTestLogin}
            disabled={submitting}
            style={{ 
              marginTop: '12px', 
              backgroundColor: 'rgba(14, 165, 233, 0.15)', 
              color: 'var(--color-primary)', 
              border: '1px solid rgba(14, 165, 233, 0.3)',
              boxShadow: 'none'
            }}
          >
            Razorpay Test Account
          </button>
        </form>
        <div className="auth-switch-link">
          <span>Don't have an account? </span>
          <button type="button" className="switch-btn highlight-gold" onClick={onSwitchView}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
