import { Phone, Globe, Lock, ExternalLink, Mail } from 'lucide-react';
import './CustomerProfile.css';

const BrandIcon = ({ type, size = 16, className, style }) => {
  if (type === 'Email') {
    return <Mail size={size} className={className} style={style} />;
  }
  if (type === 'LinkedIn') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (type === 'GitHub') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    );
  }
  if (type === 'Instagram') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  return <Globe size={size} className={className} style={style} />;
};

const CustomerProfile = ({
  customerData,
  locLoading,
  locError,
  handleDropLocation,
  setShowAuthModal,
  setAuthModalStep,
  setEnteredPassword,
  setEnteredSecurityAnswer,
  setAuthModalError,
  formatDisplayPhone,
  getTelLink
}) => {
  return (
    <div className="app-container" style={{ maxWidth: '480px', alignSelf: 'center', position: 'relative' }}>
      <main className="glass-panel card-content" style={{ padding: '36px 28px', textAlign: 'center' }}>
        {customerData.isPreview && (
          <div style={{
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.28)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            textAlign: 'left',
            color: '#f97316'
          }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ PREVIEW QR TAG PAGE
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#9a3412', lineHeight: '1.4' }}>
              This is a demonstration of how your smart keychain profile looks when someone scans your <strong>I'm Here</strong> tag. The actual page will contain your contact info.
            </p>
          </div>
        )}
        <div style={{ marginBottom: '24px' }}>
          <img src="/full logo.png" alt="I'm here" style={{ width: '160px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Hey there! Looking for me? 👀</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
            You just scanned a piece of my physical world. Want to get in touch, return a lost item, or just see what I’m up to? Here’s my digital space:
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          {/* Name field (if exists) */}
          {customerData.name && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 18px' }}>
              <span className="form-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Owner Name</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{customerData.name}</span>
            </div>
          )}

          {/* Phone number card */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="form-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Primary Phone</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                  {customerData.isPreview ? "+91 XXXXX-XXXXX" : formatDisplayPhone(customerData.number)}
                </span>
              </div>
              <a
                href={customerData.isPreview ? "#" : getTelLink(customerData.number)}
                onClick={(e) => {
                  if (customerData.isPreview) {
                    e.preventDefault();
                    alert("This is a preview page. Calling is disabled.");
                  }
                }}
                className="btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                <Phone size={12} />
                Make a call
              </a>
            </div>
          </div>

          {/* Drop Location Card */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="form-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '2px' }}>Drop Location</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Using "Drop Location" service, you can easily send your current GPS location to the owner via WhatsApp to help them find their lost item.
              </span>
            </div>

            {locError && (
              <div className="status-msg status-msg-error" style={{ fontSize: '0.8rem', padding: '8px 12px', margin: 0 }}>
                <Globe size={14} style={{ flexShrink: 0 }} />
                <span>{locError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                if (customerData.isPreview) {
                  alert("This is a preview page. Sending GPS location via WhatsApp is disabled.");
                } else {
                  handleDropLocation();
                }
              }}
              disabled={locLoading && !customerData.isPreview}
              className="btn"
              style={{
                padding: '10px 16px',
                fontSize: '0.85rem',
                background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #059669 100%)',
                color: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              {locLoading && !customerData.isPreview ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#ffffff' }}></div>
                  Fetching current location...
                </>
              ) : (
                <>
                  <Globe size={14} />
                  Drop Location 📍
                </>
              )}
            </button>
          </div>

          {/* Social links (if any exist) */}
          {customerData.socials && customerData.socials.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span className="form-label" style={{ fontSize: '0.68rem', display: 'block', marginBottom: '10px' }}>Find me online ✨</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customerData.socials.map((social, idx) => {
                  const isEmail = social.type === 'Email';
                  const linkHref = isEmail ? `mailto:${social.value}` : social.value;

                  return (
                    <a
                      key={idx}
                      href={customerData.isPreview ? "#" : linkHref}
                      target={customerData.isPreview ? "_self" : (isEmail ? '_self' : '_blank')}
                      onClick={(e) => {
                        if (customerData.isPreview) {
                          e.preventDefault();
                          alert("This is a preview page. Social links are disabled.");
                        }
                      }}
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifySelf: 'stretch',
                        gap: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'var(--border-light)';
                      }}
                    >
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        <BrandIcon type={social.type} size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {social.label}
                        </span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', color: 'var(--accent-indigo)' }}>
                          {social.value}
                        </span>
                      </div>
                      <ExternalLink size={14} style={{ opacity: 0.4 }} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.4' }}>
          😊 Thanks for scanning! Be a sweetheart and let me know if you found my item. 😉
        </div>
      </main>

      {/* floating bottom right change info button */}
      {!customerData.isPreview && (
        <button
          type="button"
          className="change-info-btn"
          onClick={() => {
            setShowAuthModal(true);
            setAuthModalStep("password");
            setEnteredPassword("");
            setEnteredSecurityAnswer("");
            setAuthModalError("");
          }}
        >
          <Lock size={12} />
          <span>Change Info</span>
        </button>
      )}
    </div>
  );
};

export default CustomerProfile;
export { BrandIcon };
