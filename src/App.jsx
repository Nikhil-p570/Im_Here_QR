import { useState, useEffect } from 'react';
import { initializeFirebase } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  Globe, 
  Sparkles, 
  Copy, 
  Check, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Database,
  Lock,
  LogOut,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

function App() {
  const isMainLanding = window.location.pathname !== '/admin1226';

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Firestore DB Instance State
  const [firestoreDb, setFirestoreDb] = useState(null);

  // App States
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Clipboard Copied State
  const [copied, setCopied] = useState(false);

  // Admin/Clear database states
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminError, setAdminError] = useState("");

  // Check session on load
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

  // Load history from Firestore when authenticated
  useEffect(() => {
    if (!isAuthenticated || !firestoreDb) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, 'links'));
        const items = [];
        querySnapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.id && data.domain) {
            items.push({
              id: data.id,
              domain: data.domain,
              url: `${data.domain}/id?=${data.id}`
            });
          }
        });
        setHistory(items);
      } catch (err) {
        console.warn("Could not load history (check Firestore rules):", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated, firestoreDb]);

  // Countdown timer effect for clear database confirmation
  useEffect(() => {
    let timer;
    if (showConfirm && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showConfirm, countdown]);

  // Action: Log In
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      setAuthError("Please enter the password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Initialize dynamic Firebase
        const dbInstance = initializeFirebase(data.config);
        setFirestoreDb(dbInstance);

        // Store session
        sessionStorage.setItem('im_here_authenticated', 'true');
        sessionStorage.setItem('im_here_firebase_config', JSON.stringify(data.config));

        setIsAuthenticated(true);
        setPassword("");
      } else {
        setAuthError(data.error || "Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setAuthError("Network error. Unable to verify password.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Action: Log Out
  const handleLogout = () => {
    sessionStorage.removeItem('im_here_authenticated');
    sessionStorage.removeItem('im_here_firebase_config');
    setIsAuthenticated(false);
    setFirestoreDb(null);
    setHistory([]);
    setResult(null);
    setShowConfirm(false);
    setCountdown(0);
    setAdminSuccess("");
    setAdminError("");
  };

  // Helper: generates an 8 character random alphanumeric ID
  const generateRandomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Helper: check Firestore and ensure ID is unique
  const getUniqueId = async () => {
    if (!firestoreDb) throw new Error("Firestore database not initialized.");
    let unique = false;
    let newId = '';
    let attempts = 0;
    
    while (!unique && attempts < 15) {
      newId = generateRandomCode();
      const docRef = doc(firestoreDb, 'links', newId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        unique = true;
      }
      attempts++;
    }

    if (!unique) {
      throw new Error("Unable to generate a unique ID after several attempts.");
    }
    return newId;
  };

  // Action: Generate ID for new Customer
  const handleGenerateId = async (e) => {
    e.preventDefault();
    if (!domain.trim()) {
      setError("Please enter a valid domain name.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setAdminSuccess("");
    setAdminError("");

    try {
      let cleanedDomain = domain.trim();
      if (cleanedDomain.endsWith('/')) {
        cleanedDomain = cleanedDomain.slice(0, -1);
      }

      const uniqueId = await getUniqueId();
      const docRef = doc(firestoreDb, 'links', uniqueId);
      
      await setDoc(docRef, {
        id: uniqueId,
        domain: cleanedDomain,
        createdAt: new Date()
      });

      const generatedUrl = `${cleanedDomain}/id?=${uniqueId}`;
      setResult({
        domain: cleanedDomain,
        id: uniqueId,
        url: generatedUrl
      });

      setHistory(prev => [{ id: uniqueId, domain: cleanedDomain, url: generatedUrl }, ...prev]);
      setDomain("");
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}. Ensure your Firestore Rules allow reads & writes.`);
    } finally {
      setLoading(false);
    }
  };

  // Action: Clear DB
  const handleClearDatabase = async () => {
    if (!firestoreDb) return;
    setClearing(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, 'links'));
      
      if (querySnapshot.empty) {
        setAdminSuccess("Database is already empty!");
        setShowConfirm(false);
        return;
      }

      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      setHistory([]);
      setResult(null);
      setAdminSuccess("All documents deleted successfully!");
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      setAdminError(`Failed to clear database: ${err.message}. Check Firestore Rules.`);
    } finally {
      setClearing(false);
    }
  };

  const handleCopyLink = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // RENDER LANDING PAGE
  if (isMainLanding) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <header className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
            <Database size={56} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.4))' }} />
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #fff 40%, #a5b4fc 70%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            I'm here
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '480px', lineHeight: '1.6' }}>
            Your digital presence, mapped.
          </p>
        </header>
      </div>
    );
  }

  // RENDER PASSWORD PROMPT (UNAUTHENTICATED ADMIN)
  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', minHeight: '80vh' }}>
        <main className="glass-panel card-content" style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', marginBottom: '16px' }}>
              <Lock className="text-indigo-400" size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Admin Access</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>Enter password to view and generate customer links</p>
          </div>

          <form onSubmit={handleLogin} className="form-group">
            <label htmlFor="passwordInput" className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                id="passwordInput"
                type="password"
                className="text-input"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authLoading}
                autoFocus
              />
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

  // RENDER ADMIN PANEL (AUTHENTICATED)
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header" style={{ position: 'relative' }}>
        <button 
          onClick={handleLogout} 
          className="btn" 
          style={{ 
            position: 'absolute', 
            right: 0, 
            top: 0, 
            padding: '8px 14px', 
            fontSize: '0.85rem', 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid var(--border-light)', 
            color: 'var(--text-secondary)',
            borderRadius: '8px'
          }}
          title="Logout Admin"
        >
          <LogOut size={14} />
          Logout
        </button>

        <h1>
          <Database className="text-cyan-400" size={32} />
          I'm here
        </h1>
        <p>Admin Dashboard — Generate unique IDs for your domains</p>
      </header>

      {/* Main Form Panel */}
      <main className="glass-panel card-content">
        <form onSubmit={handleGenerateId} className="form-group">
          <label htmlFor="domainInput" className="form-label">
            Domain Name
          </label>
          <div className="input-wrapper">
            <Globe className="input-icon" size={20} />
            <input
              id="domainInput"
              type="text"
              className="text-input"
              placeholder="e.g. www.youtube.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={loading || clearing}
              autoFocus
            />
          </div>
          
          {error && (
            <div className="status-msg status-msg-error">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || !domain.trim() || clearing}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Checking DB & Generating...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate ID
              </>
            )}
          </button>
        </form>

        {/* Display Output Result */}
        {result && (
          <div className="result-container">
            <div className="result-header">
              <span className="result-title">Generated Customer Link</span>
              <span className="history-url" style={{ opacity: 0.6 }}>ID: {result.id}</span>
            </div>
            <div className="output-link-box">
              <div className="output-link-text">{result.url}</div>
              <button 
                onClick={handleCopyLink} 
                className="btn-copy" 
                title="Copy Link"
              >
                {copied ? <Check size={18} style={{ color: '#10b981' }} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* History panel */}
      {history.length > 0 && (
        <section className="glass-panel card-content history-section">
          <div className="history-title">
            <History size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
            Recent Mappings ({history.length})
          </div>
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <span className="history-domain" title={item.domain}>{item.domain}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="history-url">{item.url}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(item.url);
                    }} 
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                    title="Copy Link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin Operations Panel */}
      <footer className="glass-panel card-content admin-card">
        <div className="admin-header">
          <Trash2 size={20} />
          <span>Danger Zone</span>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          Reset your database. This will wipe all generated IDs from your Firestore collection.
        </p>

        {adminSuccess && (
          <div className="status-msg status-msg-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{adminSuccess}</span>
          </div>
        )}

        {adminError && (
          <div className="status-msg status-msg-error" style={{ marginBottom: '16px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{adminError}</span>
          </div>
        )}

        {!showConfirm ? (
          <button 
            type="button" 
            className="btn btn-danger-outline" 
            onClick={() => { setShowConfirm(true); setCountdown(3); }}
            disabled={loading || clearing}
            style={{ width: '100%' }}
          >
            Clear Database
          </button>
        ) : (
          <div className="confirmation-box">
            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-rose)' }}>
              Are you sure? This action is permanent and cannot be undone.
            </p>
            <div className="confirmation-actions">
              <button 
                className="btn-confirm-no" 
                onClick={() => { setShowConfirm(false); setCountdown(0); }}
                disabled={clearing}
              >
                Cancel
              </button>
              <button 
                className="btn-confirm-yes" 
                onClick={handleClearDatabase}
                disabled={clearing || countdown > 0}
                style={{ 
                  opacity: countdown > 0 ? 0.6 : 1, 
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer' 
                }}
              >
                {clearing ? (
                  'Clearing...'
                ) : countdown > 0 ? (
                  `Confirm in ${countdown}s`
                ) : (
                  'Yes, Delete Everything'
                )}
              </button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
