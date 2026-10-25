import React, { useState } from 'react';
import { api } from '../../api/client';
import { 
  Scale, 
  Lock, 
  Mail, 
  User, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Briefcase, 
  Award,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export default function AuthView({ onAuthSuccess, showToast }) {
  // Modes: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [barCouncilNumber, setBarCouncilNumber] = useState('');
  const [chamberName, setChamberName] = useState('');
  const [resetToken, setResetToken] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Quick-fill demo account handler
  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFormError('');
  };

  const clearMessages = () => {
    setFormError('');
    setSuccessInfo(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !password) {
      setFormError('Please enter both your advocate email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.success && res.user) {
        showToast(`Welcome, Advocate ${res.user.name}`, 'success');
        onAuthSuccess(res.user);
      } else {
        setFormError(res.error || 'Failed to authenticate');
      }
    } catch (err) {
      setFormError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!name || name.trim().length < 2) {
      setFormError('Please provide your full legal name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setFormError('Please provide a valid advocate email address.');
      return;
    }
    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setFormError('Password must contain at least one letter and one number.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.signup({
        name,
        email,
        password,
        barCouncilNumber,
        chamberName
      });
      if (res.success && res.user) {
        showToast(`Advocate account registered. Welcome, ${res.user.name}!`, 'success');
        onAuthSuccess(res.user);
      } else {
        setFormError(res.error || 'Registration failed');
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!email || !email.includes('@')) {
      setFormError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccessInfo(res);
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err) {
      setFormError(err.message || 'Unable to process password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!resetToken || resetToken.trim().length < 10) {
      setFormError('Please enter a valid password reset token.');
      return;
    }
    if (!password || password.length < 8) {
      setFormError('New password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword({ token: resetToken, newPassword: password });
      if (res.success) {
        showToast('Password reset successfully! You can now log in.', 'success');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setResetToken('');
        clearMessages();
      } else {
        setFormError(res.error || 'Reset failed');
      }
    } catch (err) {
      setFormError(err.message || 'Invalid or expired reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#060A12',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(15, 23, 42, 0.6) 0%, transparent 50%)',
      padding: '2rem 1rem',
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: mode === 'signup' ? '540px' : '460px',
        backgroundColor: '#0F172A',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.1)',
        padding: '2.25rem',
        position: 'relative'
      }}>
        {/* Top Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(15, 23, 42, 0.8))',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            marginBottom: '0.85rem'
          }}>
            <Scale size={28} color="#D4AF37" />
          </div>
          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#F8FAFC',
            margin: '0 0 0.35rem 0',
            letterSpacing: '-0.02em'
          }}>
            DraftMate Evidence Intelligence
          </h1>
          <p style={{
            fontSize: '0.82rem',
            color: '#94A3B8',
            margin: 0
          }}>
            India-Focused AI Legal Workbench • Multi-User Account Portal
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '6px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            lineHeight: 1.45
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{formError}</div>
          </div>
        )}

        {/* =========================================================================
            MODE 1: LOGIN
           ========================================================================= */}
        {mode === 'login' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Advocate Sign In
              </h2>
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                Secure Session
              </span>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Advocate Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="advocate@chamber.in"
                    className="input font-sans"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      background: '#060A12',
                      borderColor: 'rgba(212, 175, 55, 0.25)',
                      color: '#F8FAFC',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 500 }}>
                    Chamber Password
                  </label>
                  <button
                    type="button"
                    onClick={() => { clearMessages(); setMode('forgot'); }}
                    style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input font-sans"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      background: '#060A12',
                      borderColor: 'rgba(212, 175, 55, 0.25)',
                      color: '#F8FAFC',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-gold"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoading ? (
                  <span>Authenticating Advocate...</span>
                ) : (
                  <>
                    <span>Enter Legal Workbench</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Quick-Fill Demo Evaluator Buttons */}
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.72rem',
                color: '#D4AF37',
                marginBottom: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <Sparkles size={13} />
                <span>One-Click Test Accounts (Multi-User Demo)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => handleQuickFill('rajesh.sharma@delhibar.in', 'AdvocateRajesh2026!')}
                  style={{
                    background: 'rgba(212, 175, 55, 0.08)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '6px',
                    padding: '0.6rem 0.5rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#F8FAFC',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#ECC86A' }}>
                    User A: Adv. Rajesh
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                    Commercial Division
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('priya.desai@bombaybar.in', 'SeniorPriya2026!')}
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '6px',
                    padding: '0.6rem 0.5rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#F8FAFC',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#7DD3FC' }}>
                    User B: Adv. Priya
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                    Arbitration Counsel
                  </div>
                </button>
              </div>
            </div>

            {/* Switch to Signup */}
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
              New advocate on DraftMate?{' '}
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('signup'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#D4AF37',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Create your account
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 2: SIGN UP
           ========================================================================= */}
        {mode === 'signup' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Advocate Registration
              </h2>
              <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                Indian Bar Verification
              </span>
            </div>

            <form onSubmit={handleSignup}>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Full Legal Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Advocate Rajesh Sharma"
                    className="input font-sans"
                    style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 500 }}>
                  Advocate Email Address <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rajesh.sharma@chamber.in"
                    className="input font-sans"
                    style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                    Bar Council Enrolment (Opt)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Award size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={barCouncilNumber}
                      onChange={(e) => setBarCouncilNumber(e.target.value)}
                      placeholder="D/1842/2018"
                      className="input font-sans"
                      style={{ width: '100%', paddingLeft: '32px', background: '#060A12', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#F8FAFC', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                    Chamber / Law Firm (Opt)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={chamberName}
                      onChange={(e) => setChamberName(e.target.value)}
                      placeholder="Sharma & Associates"
                      className="input font-sans"
                      style={{ width: '100%', paddingLeft: '32px', background: '#060A12', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#F8FAFC', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="input font-sans"
                      style={{ width: '100%', paddingLeft: '32px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.35rem', fontWeight: 500 }}>
                    Confirm Password <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#64748B" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="input font-sans"
                      style={{ width: '100%', paddingLeft: '32px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '1rem', lineHeight: 1.4 }}>
                Password requires minimum 8 characters, with at least 1 letter and 1 numeric digit. Hashed securely with bcrypt.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-gold"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isLoading ? (
                  <span>Registering Advocate Account...</span>
                ) : (
                  <>
                    <span>Create Private Legal Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#D4AF37', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign in to your chamber
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 3: FORGOT PASSWORD
           ========================================================================= */}
        {mode === 'forgot' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Reset Chamber Password
              </h2>
            </div>

            {!successInfo ? (
              <form onSubmit={handleForgotPassword}>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Enter the email address registered with your advocate account. We will issue a secure, single-use password reset token valid for 60 minutes.
                </p>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Registered Advocate Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="advocate@chamber.in"
                      className="input font-sans"
                      style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-gold"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  {isLoading ? 'Generating Reset Token...' : 'Request Password Reset Token'}
                </button>
              </form>
            ) : (
              <div>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34D399', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                    <CheckCircle size={18} />
                    <span>Password Reset Initiated</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: '0 0 0.75rem 0', lineHeight: 1.45 }}>
                    {successInfo.message}
                  </p>

                  {/* If SMTP is unconfigured in development/demo, token is displayed cleanly */}
                  {successInfo.resetToken && (
                    <div style={{
                      background: '#060A12',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      marginTop: '0.75rem'
                    }}>
                      <div style={{ fontSize: '0.72rem', color: '#D4AF37', fontWeight: 600, marginBottom: '0.35rem' }}>
                        ONE-TIME VERIFICATION TOKEN (60 MIN EXPIRY):
                      </div>
                      <code style={{
                        display: 'block',
                        wordBreak: 'break-all',
                        fontSize: '0.76rem',
                        color: '#ECC86A',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '0.4rem',
                        borderRadius: '4px'
                      }}>
                        {successInfo.resetToken}
                      </code>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('reset');
                  }}
                  className="btn btn-gold"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  Proceed to Reset Password Now
                </button>
              </div>
            )}

            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODE 4: RESET PASSWORD
           ========================================================================= */}
        {mode === 'reset' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                Set New Chamber Password
              </h2>
            </div>

            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Reset Token (Single-Use)
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste your 64-char hex reset token"
                    className="input font-mono"
                    style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#ECC86A', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters (letters & digits)"
                    className="input font-sans"
                    style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="input font-sans"
                    style={{ width: '100%', paddingLeft: '38px', background: '#060A12', borderColor: 'rgba(212, 175, 55, 0.25)', color: '#F8FAFC', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-gold"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {isLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
              </button>
            </form>
          </div>
        )}

        {/* Security Badge Footer */}
        <div style={{
          marginTop: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          color: '#64748B',
          fontSize: '0.72rem'
        }}>
          <ShieldCheck size={14} color="#10B981" />
          <span>Strict User Data Isolation • Atomic Crash-Safe Storage • BNSS & BSA Compliant</span>
        </div>
      </div>
    </div>
  );
}
