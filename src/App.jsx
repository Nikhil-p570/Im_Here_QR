import { useState, useEffect } from 'react';
import { db } from './firebase';
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
  ArrowRight,
  RefreshCw
} from 'lucide-react';

function App() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Clipboard Copied State
  const [copied, setCopied] = useState(false);

  // Admin/Clear database states
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminError, setAdminError] = useState("");

  // Load history from Firestore on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'links'));
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
  }, []);

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
    let unique = false;
    let newId = '';
    let attempts = 0;
    
    while (!unique && attempts < 15) {
      newId = generateRandomCode();
      const docRef = doc(db, 'links', newId);
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
      // Remove trailing slash if present
      if (cleanedDomain.endsWith('/')) {
        cleanedDomain = cleanedDomain.slice(0, -1);
      }

      const uniqueId = await getUniqueId();
      const docRef = doc(db, 'links', uniqueId);
      
      // Save mapping in Firestore
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

      // Update local history
      setHistory(prev => [{ id: uniqueId, domain: cleanedDomain, url: generatedUrl }, ...prev]);
      setDomain(""); // Clear input
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}. Ensure your Firestore Rules allow reads & writes.`);
    } finally {
      setLoading(false);
    }
  };

  // Action: Clear DB
  const handleClearDatabase = async () => {
    setClearing(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const querySnapshot = await getDocs(collection(db, 'links'));
      
      if (querySnapshot.empty) {
        setAdminSuccess("Database is already empty!");
        setShowConfirm(false);
        return;
      }

      // Delete each document individually (suitable for dev testing/small databases)
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

  // Action: Copy output link to clipboard
  const handleCopyLink = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>
          <Database className="text-cyan-400" size={32} />
          I'm here
        </h1>
        <p>Generate unique, non-overlapping IDs for your domains</p>
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
