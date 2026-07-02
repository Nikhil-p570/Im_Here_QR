import React, { useState } from 'react';
import { Lock, AlertTriangle, Mail, Phone, Eye, EyeOff } from 'lucide-react';

const AuthModal = ({
  showAuthModal,
  setShowAuthModal,
  authModalStep,
  setAuthModalStep,
  enteredPassword,
  setEnteredPassword,
  enteredSecurityAnswer,
  setEnteredSecurityAnswer,
  authModalError,
  setAuthModalError,
  customerData,
  handlePasswordSubmit,
  handleSecuritySubmit
}) => {
  const [showPassword, setShowPassword] = useState(false);

  if (!showAuthModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '32px 24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        textAlign: 'center'
      }}>
        {authModalStep === 'password' ? (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                marginBottom: '12px'
              }}>
                <Lock size={24} style={{ color: 'var(--accent-indigo)' }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Enter Tag Password</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.4' }}>
                Please enter your password to edit this tag's details.
              </p>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="tag-password"
                  name="password"
                  autoComplete="current-password"
                  className="text-input"
                  placeholder="Enter password"
                  value={enteredPassword}
                  onChange={(e) => setEnteredPassword(e.target.value)}
                  style={{ padding: '12px 48px 12px 42px', fontSize: '0.9rem' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authModalError && (
              <div className="status-msg status-msg-error" style={{ fontSize: '0.8rem', padding: '8px 12px', margin: 0 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{authModalError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-confirm-no"
                onClick={() => {
                  setShowAuthModal(false);
                  setEnteredPassword("");
                  setAuthModalError("");
                }}
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                Submit
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuthModalStep('forgot_password');
                setAuthModalError("");
                setEnteredPassword("");
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-indigo)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
                marginTop: '8px',
                textAlign: 'center'
              }}
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleSecuritySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Answer Security Question</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', lineHeight: '1.4' }}>
                Verify your identity to reset password or edit details.
              </p>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-light)',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              fontWeight: 500,
              textAlign: 'left'
            }}>
              <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--text-secondary)', marginBottom: '4px' }}>Question:</span>
              {customerData?.securityQuestion || "No security question set. Contact support."}
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Your Answer</label>
              <input
                type="text"
                className="text-input"
                placeholder="Enter security answer"
                value={enteredSecurityAnswer}
                onChange={(e) => setEnteredSecurityAnswer(e.target.value)}
                style={{ padding: '12px 14px', fontSize: '0.9rem' }}
                autoFocus
              />
            </div>

            {authModalError && (
              <div className="status-msg status-msg-error" style={{ fontSize: '0.8rem', padding: '8px 12px', margin: 0 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>{authModalError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-confirm-no"
                onClick={() => {
                  setShowAuthModal(false);
                  setEnteredSecurityAnswer("");
                  setAuthModalError("");
                }}
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                Verify Answer
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuthModalStep('password');
                setAuthModalError("");
                setEnteredSecurityAnswer("");
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '4px',
                textAlign: 'center'
              }}
            >
              ← Back to Password
            </button>

            {/* Customer Care Support */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-light)',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Don't worry! Contact customer care for immediate assistance:
              </p>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                alignItems: 'center'
              }}>
                <a href="mailto:nikhil.pabbisetti2006@gmail.com" style={{ color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} /> nikhil.pabbisetti2006@gmail.com
                </a>
                <a href="tel:+918919626878" style={{ color: 'var(--accent-indigo)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} /> +91 8919626878
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
