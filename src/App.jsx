/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { initializeFirebase } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AlertTriangle, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

// Subcomponents
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import CustomerProfile from './components/CustomerProfile';
import CustomerRegistration from './components/CustomerRegistration';
import CustomerEditProfile from './components/CustomerEditProfile';
import AdminPanel from './components/AdminPanel';
import OrderPage from './components/OrderPage';
import PolicyPage from './components/PolicyPage';
import PaymentStatus from './components/PaymentStatus';

const formatDisplayPhone = (num) => {
  if (!num) return "";
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  if (cleaned.length > 5) {
    const half = Math.ceil(cleaned.length / 2);
    return `${cleaned.slice(0, half)}-${cleaned.slice(half)}`;
  }
  return num;
};

const getTelLink = (num) => {
  if (!num) return "";
  const cleaned = num.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `tel:+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `tel:+${cleaned}`;
  }
  return `tel:${cleaned}`;
};

function App() {
  const path = window.location.pathname;
  
  // Strict route checking (the formal way to handle 404s/invalid paths)
  const validPaths = [
    '/',
    '/admin1226',
    '/orders',
    '/terms',
    '/privacy',
    '/shipping_policy',
    '/refund_policy',
    '/payment-status',
    '/id'
  ];

  if (!validPaths.includes(path)) {
    window.location.replace('/');
    return null;
  }

  const isMainLanding = path !== '/admin1226';

  // Orders page — render standalone, no auth needed
  if (path === '/orders') {
    return <OrderPage />;
  }

  // Policy pages — render standalone, no auth needed
  if (['/terms', '/privacy', '/shipping_policy', '/refund_policy'].includes(path)) {
    return <PolicyPage />;
  }

  // Payment status page — render standalone, no auth needed
  if (path === '/payment-status') {
    return <PaymentStatus />;
  }

  // Auth States (Admin Cockpit authentication)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Firestore DB Instance State
  const [firestoreDb, setFirestoreDb] = useState(null);

  // Customer-facing tag states
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerData, setCustomerData] = useState(null);

  // Edit / Owner Update Flow States
  const [isEditing, setIsEditing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalStep, setAuthModalStep] = useState("password"); // password or forgot_password
  const [enteredPassword, setEnteredPassword] = useState("");
  const [enteredSecurityAnswer, setEnteredSecurityAnswer] = useState("");
  const [authModalError, setAuthModalError] = useState("");

  // Geolocation States
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  // Check session on load (Admin Cockpit)
  useEffect(() => {
    if (isMainLanding) return;

    const sessionAuth = sessionStorage.getItem('im_here_authenticated');
    const sessionConfig = sessionStorage.getItem('im_here_firebase_config');

    if (sessionAuth === 'true' && sessionConfig) {
      try {
        const config = JSON.parse(sessionConfig);
        const dbInstance = initializeFirebase(config);
        setFirestoreDb(dbInstance);
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Session restoration error:", err);
        handleLogout();
      }
    }
  }, [isMainLanding]);

  const getUrlId = () => {
    if (window.location.pathname === '/id') {
      const search = window.location.search;
      if (search.startsWith('?=')) {
        return search.substring(2).trim();
      } else if (search.startsWith('?id=')) {
        return search.substring(4).trim();
      } else if (search.substring(1).trim()) {
        return search.substring(1).trim();
      }
    }
    return null;
  };

  const customerId = getUrlId();

  // Load customer QR tag details if ID is present
  useEffect(() => {
    if (!customerId) return;

    if (customerId === 'preview') {
      setCustomerData({
        id: 'preview',
        status: 'registered',
        name: 'John Doe (Preview)',
        number: '919999999999',
        whatsappEnabled: true,
        altNumber: '',
        message: 'This is a preview QR tag. Scanning a registered keychain tag will show the owner\'s contact info.',
        rewardEnabled: true,
        rewardAmount: '500',
        password: 'preview_password',
        isPreview: true,
        socials: [
          { label: 'Instagram', type: 'Instagram', value: 'instagram.com/preview' },
          { label: 'GitHub', type: 'GitHub', value: 'github.com/preview' }
        ]
      });
      setCustomerLoading(false);
      setCustomerError("");
      return;
    }

    const initCustomerDb = async () => {
      setCustomerLoading(true);
      setCustomerError("");

      try {
        const res = await fetch(`/api/profile?id=${encodeURIComponent(customerId)}`);
        const data = await res.json();
        
        if (res.ok && data.success && data.profile) {
          setCustomerData(data.profile);
        } else {
          setCustomerError(data.error || "This QR Tag ID does not exist or has been removed.");
        }
      } catch (err) {
        console.error(err);
        setCustomerError(`Failed to fetch QR details: ${err.message}`);
      } finally {
        setCustomerLoading(false);
      }
    };

    initCustomerDb();
  }, [firestoreDb, customerId]);

  // Action: Log In (Admin Cockpit)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      setAuthError("Please enter the password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    let apiSuccess = false;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          apiSuccess = true;
          const dbInstance = initializeFirebase(data.config);
          setFirestoreDb(dbInstance);
          sessionStorage.setItem('im_here_authenticated', 'true');
          sessionStorage.setItem('im_here_firebase_config', JSON.stringify(data.config));
          setIsAuthenticated(true);
          setPassword("");
          setAuthLoading(false);
          return;
        } else {
          setAuthError(data.error || "Incorrect password. Please try again.");
          setAuthLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API verify failed, attempting local fallback check:", err);
    }

    // Fallback for local development
    if (!apiSuccess) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        const localPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Nikhil@2006';
        if (password === localPassword) {
          const localConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
          };

          try {
            const dbInstance = initializeFirebase(localConfig);
            setFirestoreDb(dbInstance);
            sessionStorage.setItem('im_here_authenticated', 'true');
            sessionStorage.setItem('im_here_firebase_config', JSON.stringify(localConfig));
            setIsAuthenticated(true);
            setPassword("");
          } catch (initErr) {
            setAuthError(`Local config error: ${initErr.message}`);
          }
        } else {
          setAuthError("Incorrect password (local fallback check).");
        }
      } else {
        setAuthError("Network error. Unable to verify password.");
      }
    }

    setAuthLoading(false);
  };

  // Action: Log Out (Admin Cockpit)
  function handleLogout() {
    sessionStorage.removeItem('im_here_authenticated');
    sessionStorage.removeItem('im_here_firebase_config');
    setIsAuthenticated(false);
    setFirestoreDb(null);
  }

  // Submit Password Verification for Changing Customer Info
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthModalError("");
    
    if (!enteredPassword.trim()) {
      setAuthModalError("Please enter your password.");
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          id: customerId,
          password: enteredPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Save the correct password temporarily for edit authorization on submission
        sessionStorage.setItem(`owner_session_pass_${customerId}`, enteredPassword);
        setIsEditing(true);
        setShowAuthModal(false);
        setEnteredPassword("");
      } else {
        setAuthModalError(data.error || "Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setAuthModalError("Failed to verify password. Please try again.");
    }
  };

  // Submit Security Answer Recovery for Changing Customer Info
  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setAuthModalError("");

    if (!enteredSecurityAnswer.trim()) {
      setAuthModalError("Please enter your security answer.");
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          id: customerId,
          securityAnswer: enteredSecurityAnswer
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Store verification method (security answer used)
        sessionStorage.setItem(`owner_session_bypass_${customerId}`, enteredSecurityAnswer);
        setIsEditing(true);
        setShowAuthModal(false);
        setEnteredSecurityAnswer("");
      } else {
        setAuthModalError(data.error || "Incorrect answer. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setAuthModalError("Failed to verify security answer. Please try again.");
    }
  };

  // Trigger Geolocation and drop location message structure
  const handleDropLocation = () => {
    setLocLoading(true);
    setLocError("");

    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const messageText = `Hi there! I just scanned your I'm Here smart QR tag and found your missing item.\n\nHere is my current location so you can retrieve it:\nhttps://maps.google.com/?q=${lat},${lng}`;
        const waUrl = `https://wa.me/${customerData.number}?text=${encodeURIComponent(messageText)}`;
        setLocLoading(false);
        window.open(waUrl, '_blank');
      },
      (error) => {
        setLocLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocError("Location permission denied. Please allow location access.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocError("Location request timed out.");
            break;
          default:
            setLocError("An unknown error occurred while fetching location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // RENDER CUSTOMER FINDER OR LANDING PAGE
  if (isMainLanding) {
    if (customerId) {
      if (customerLoading) {
        return (
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--accent-indigo)' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Locating owner details...</p>
          </div>
        );
      }

      if (customerError) {
        return (
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', alignSelf: 'center' }}>
            <main className="glass-panel card-content" style={{ maxWidth: '460px', width: '100%', margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1px solid rgba(244, 63, 94, 0.15)',
                marginBottom: '16px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <AlertTriangle size={28} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Tag Error</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem', lineHeight: '1.5' }}>{customerError}</p>
              
              <a
                href="/"
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Go to Homepage
              </a>
            </main>
          </div>
        );
      }

      if (customerData) {
        const isUnregistered = customerData.status === 'unregistered';

        if (isUnregistered) {
          return (
            <CustomerRegistration
              firestoreDb={firestoreDb}
              customerId={customerId}
              onSuccess={(updatedData) => setCustomerData(updatedData)}
            />
          );
        } else {
          return (
            <>
              {isEditing ? (
                <CustomerEditProfile
                  firestoreDb={firestoreDb}
                  customerId={customerId}
                  customerData={customerData}
                  onSuccess={(updatedData) => setCustomerData(updatedData)}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <CustomerProfile
                  customerData={customerData}
                  locLoading={locLoading}
                  locError={locError}
                  handleDropLocation={handleDropLocation}
                  setShowAuthModal={setShowAuthModal}
                  setAuthModalStep={setAuthModalStep}
                  setEnteredPassword={setEnteredPassword}
                  setEnteredSecurityAnswer={setEnteredSecurityAnswer}
                  setAuthModalError={setAuthModalError}
                  formatDisplayPhone={formatDisplayPhone}
                  getTelLink={getTelLink}
                />
              )}

              <AuthModal
                showAuthModal={showAuthModal}
                setShowAuthModal={setShowAuthModal}
                authModalStep={authModalStep}
                setAuthModalStep={setAuthModalStep}
                enteredPassword={enteredPassword}
                setEnteredPassword={setEnteredPassword}
                enteredSecurityAnswer={enteredSecurityAnswer}
                setEnteredSecurityAnswer={setEnteredSecurityAnswer}
                authModalError={authModalError}
                setAuthModalError={setAuthModalError}
                customerData={customerData}
                handlePasswordSubmit={handlePasswordSubmit}
                handleSecuritySubmit={handleSecuritySubmit}
              />
            </>
          );
        }
      }
    }

    // Default main landing page
    return <LandingPage firestoreDb={firestoreDb} setFirestoreDb={setFirestoreDb} />;
  }

  // RENDER PASSWORD PROMPT (UNAUTHENTICATED ADMIN)
  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', minHeight: '80vh', alignSelf: 'center' }}>
        <main className="glass-panel card-content" style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src="/full logo black.png" alt="I'm here" style={{ width: '120px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Access</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Enter password to view and generate customer links</p>
          </div>

          <form onSubmit={handleLogin} className="form-group">
            <label htmlFor="passwordInput" className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="passwordInput"
                type={showPassword ? "text" : "password"}
                className="text-input"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authLoading}
                autoFocus
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {authError && (
              <div className="status-msg status-msg-error">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={authLoading || !password}>
              {authLoading ? (
                <>
                  <div className="spinner"></div>
                  Verifying Securely...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Access Dashboard
                </>
              )}
            </button>
          </form>
        </main>
      </div>
    );
  }

  // RENDER ADMIN PANEL (AUTHENTICATED - SPLIT SCREEN COCKPIT)
  return (
    <AdminPanel
      firestoreDb={firestoreDb}
      onLogout={handleLogout}
    />
  );
}

export default App;
