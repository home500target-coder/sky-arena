import React, { useState } from 'react';
import { useDB } from '../context/DBContext';
import { User, Mail, Phone, Lock, Eye, EyeOff, ShieldAlert, KeyRound, Gift, RefreshCw } from 'lucide-react';

const getPasswordStrength = (pass) => {
  if (!pass) return { score: 0, label: '', color: '', percent: 0 };
  
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;
  if (pass.length >= 10) score += 1;

  if (score <= 1) {
    return { score, label: 'Weak', color: '#ef4444', percent: 20 };
  } else if (score <= 3) {
    return { score, label: 'Medium', color: '#eab308', percent: 60 };
  } else {
    return { score, label: 'Strong', color: '#10b981', percent: 100 };
  }
};

export default function RegisterView({ onSwitchView }) {
  const { registerUser, verifyReferral } = useDB();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [registerError, setRegisterError] = useState('');
  
  const [referralVerified, setReferralVerified] = useState(null);
  const [referralMessage, setReferralMessage] = useState('');
  const [verifyingReferral, setVerifyingReferral] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleVerifyReferral = async () => {
    if (!referralCode.trim()) {
      setReferralVerified(false);
      setReferralMessage('Please enter a referral code first.');
      return;
    }
    setVerifyingReferral(true);
    setReferralVerified(null);
    setReferralMessage('');
    try {
      const res = await verifyReferral(referralCode);
      if (res.success) {
        setReferralVerified(true);
        setReferralMessage(res.message);
      } else {
        setReferralVerified(false);
        setReferralMessage(res.message);
      }
    } catch (error) {
      setReferralVerified(false);
      setReferralMessage('Failed to connect to server.');
    } finally {
      setVerifyingReferral(false);
    }
  };

  // Auto-fill and auto-verify referral code if present in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      const cleanCode = refParam.trim().toUpperCase();
      setReferralCode(cleanCode);
      
      const autoVerify = async () => {
        setVerifyingReferral(true);
        setReferralVerified(null);
        setReferralMessage('');
        try {
          const res = await verifyReferral(cleanCode);
          if (res.success) {
            setReferralVerified(true);
            setReferralMessage(res.message);
          } else {
            setReferralVerified(false);
            setReferralMessage(res.message);
          }
        } catch (error) {
          setReferralVerified(false);
          setReferralMessage('Failed to connect to server.');
        } finally {
          setVerifyingReferral(false);
        }
      };
      autoVerify();
    }
  }, [verifyReferral]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    
    if (!name.trim()) {
      errs.name = 'Full name is required';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Invalid email address format';
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    } else {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
      if (!/^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleanPhone)) {
        errs.phone = 'Enter a valid 10-digit mobile number (e.g. +919876543210)';
      }
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    } else {
      const strength = getPasswordStrength(password);
      if (strength.label !== 'Strong') {
        errs.password = 'Password must be Strong! Add numbers, mixed case letters, and special symbols.';
      }
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm password is required';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setRegisterError('');
    setSubmitting(true);

    try {
      const res = await registerUser(name, email, phone, password, referralCode);
      if (!res.success) {
        setRegisterError(res.message);
      } else {
        alert(res.message);
      }
    } catch (error) {
      setRegisterError('Server connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card animated-scale-up" style={{ padding: '20px 20px' }}>
        <div className="auth-logo-section" style={{ gap: '4px' }}>
          <div className="auth-logo-circle" style={{ width: '50px', height: '50px' }}>
            <KeyRound size={28} className="highlight-gold" />
          </div>
          <h2 style={{ fontSize: '1.25rem' }}>CREATE ACCOUNT</h2>
          <p style={{ fontSize: '0.625rem' }}>Join SkyArena Esports Lobbies</p>
        </div>

        <form className="auth-form" noValidate onSubmit={handleSubmit} style={{ gap: '8px', marginTop: '10px' }}>
          {registerError && (
            <div className="auth-alert-error">
              <ShieldAlert size={16} />
              <span>{registerError}</span>
            </div>
          )}

          <div className="form-group">
            <label>Full Name</label>
            <div className="input-with-icon-wrapper">
              <User size={16} className="input-icon-left" />
              <input 
                type="text" 
                placeholder="Enter full name" 
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: null })); }}
                style={{ borderColor: errors.name ? '#ef4444' : 'var(--color-border)' }}
              />
            </div>
            {errors.name && <span className="custom-input-error">{errors.name}</span>}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Email Address</label>
              <div className="input-with-icon-wrapper">
                <Mail size={16} className="input-icon-left" />
                <input 
                  type="email" 
                  placeholder="email@example.com" 
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: null })); }}
                  style={{ borderColor: errors.email ? '#ef4444' : 'var(--color-border)' }}
                />
              </div>
              {errors.email && <span className="custom-input-error">{errors.email}</span>}
            </div>

            <div className="form-group flex-1">
              <label>Phone Number</label>
              <div className="input-with-icon-wrapper">
                <Phone size={16} className="input-icon-left" />
                <input 
                  type="tel" 
                  placeholder="e.g. +919876543210" 
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: null })); }}
                  style={{ borderColor: errors.phone ? '#ef4444' : 'var(--color-border)' }}
                />
              </div>
              {errors.phone && <span className="custom-input-error">{errors.phone}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Password (min 6 chars)</label>
            <div className="input-with-icon-wrapper">
              <Lock size={16} className="input-icon-left" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Create password" 
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
            {password && (
              <div className="password-strength-meter">
                <div className="strength-bar-bg">
                  <div 
                    className="strength-bar-fill" 
                    style={{ 
                      width: `${getPasswordStrength(password).percent}%`, 
                      backgroundColor: getPasswordStrength(password).color 
                    }}
                  />
                </div>
                <span className="strength-label" style={{ color: getPasswordStrength(password).color }}>
                  Security: {getPasswordStrength(password).label}
                </span>
              </div>
            )}
            {errors.password && <span className="custom-input-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-with-icon-wrapper">
              <Lock size={16} className="input-icon-left" />
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Confirm password" 
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: null })); }}
                style={{ borderColor: errors.confirmPassword ? '#ef4444' : 'var(--color-border)' }}
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <span className="custom-input-error">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group">
            <label>Referral Code (Optional)</label>
            <div className="input-with-icon-wrapper">
              <Gift size={16} className="input-icon-left" />
              <input 
                type="text" 
                placeholder="e.g. SKYARENA_RAKESH12" 
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value);
                  setReferralVerified(null);
                  setReferralMessage('');
                }}
                style={{ paddingRight: '75px' }}
              />
              {referralCode.trim() && (
                <button
                  type="button"
                  className="referral-verify-btn"
                  onClick={handleVerifyReferral}
                  disabled={verifyingReferral}
                >
                  {verifyingReferral ? '...' : 'Verify'}
                </button>
              )}
            </div>
            {referralMessage && (
              <span className={`referral-verify-status ${referralVerified ? 'success' : 'error'}`}>
                {referralMessage}
              </span>
            )}
          </div>

          <button type="submit" className="auth-submit-btn" style={{ marginTop: '6px' }} disabled={submitting}>
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw className="spin-animate" size={16} /> Registering...
              </span>
            ) : (
              "Register Account"
            )}
          </button>
        </form>

        <div className="auth-switch-link" style={{ marginTop: '12px' }}>
          <span>Already have an account? </span>
          <button type="button" className="switch-btn highlight-gold" onClick={onSwitchView}>
            Log In
          </button>
        </div>
      </div>
    </div>
  );
}
