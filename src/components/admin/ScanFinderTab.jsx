import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const ScanFinderTab = () => {
  // Local state for Scan Finder
  const [cameraActive, setCameraActive] = useState(false);
  const startCamera = () => {
    setCameraActive(true);
    setLookupResult(null);
    setLookupError("");
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          html5QrCode.stop().then(() => setCameraActive(false)).catch(console.error);
          setLookupId(decodedText);
          // Wait briefly for state to update, then look up
          setTimeout(() => handleLookupTag({ preventDefault: () => {} }, decodedText), 50);
        },
        (error) => {}
      ).catch(err => {
        alert("Camera start failed: " + err);
        setCameraActive(false);
      });
      window.activeQrScanner = html5QrCode;
    }, 100);
  };
  const stopCamera = () => {
    if (window.activeQrScanner) {
      window.activeQrScanner.stop().catch(console.error);
      window.activeQrScanner = null;
    }
    setCameraActive(false);
  };

  const [lookupId, setLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [showAddTagOption, setShowAddTagOption] = useState(false);

  const handleLookupTag = async (e, directId = null) => {
    if (e) e.preventDefault();
    const idValue = directId || lookupId;
    if (!idValue || !idValue.trim()) return;

    let idToLookup = idValue.trim();
    if (idToLookup.includes('?=')) idToLookup = idToLookup.split('?=')[1];
    if (idToLookup.includes('?id=')) idToLookup = idToLookup.split('?id=')[1];
    if (idToLookup.includes('/')) idToLookup = idToLookup.split('/').pop();
    idToLookup = idToLookup.split('&')[0];
    
    setLookupId(idToLookup);
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    setShowAddTagOption(false);

    try {
      const res = await fetch(`/api/profile?id=${encodeURIComponent(idToLookup)}`);
      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        setLookupResult({
           ...data.profile,
           tagId: idToLookup
        });
      } else {
        setLookupError(data.error || "Tag not found.");
      }
    } catch (err) {
      setLookupError("Failed to lookup: " + err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddMissingTag = () => {
     alert("Add missing tag API not configured yet.");
  };
  const handleUploadQrFile = () => {
     alert("Upload file logic to be implemented. Please use Camera for now.");
  };

  const [packingSessionActive, setPackingSessionActive] = useState(false);
  const [packingPhoneToBoxMap, setPackingPhoneToBoxMap] = useState({});
  const [maxBoxNumber, setMaxBoxNumber] = useState(0);
  const [lastAssignedBox, setLastAssignedBox] = useState(null);
  const [packingHistory, setPackingHistory] = useState([]);
  const [packingBoxesData, setPackingBoxesData] = useState({});
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleResetTagData = () => {};
  return (
    <div className="glass-panel card-content" style={{ marginTop: '12px' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-indigo) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '20px' }}>
        🔍 Scan Finder &amp; Tag Lookup
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px', textAlign: 'left', lineHeight: '1.5' }}>
        Scan a physical keychain using your device camera or type/paste its QR link or Tag ID below to lookup the order details.
      </p>

      {/* Packing Helper Session Controls */}
      <div style={{
        background: packingSessionActive ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
        border: packingSessionActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-light)',
        borderRadius: '16px', padding: '20px',
        maxWidth: '600px', margin: '0 auto 24px auto', textAlign: 'left'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: packingSessionActive ? '#a5b4fc' : 'var(--text-primary)' }}>
              📦 Packing Box Helper
              {packingSessionActive && <span className="pulse-indicator" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {packingSessionActive
                ? `Active packing session: ${Object.keys(packingPhoneToBoxMap).length} orders grouped across ${maxBoxNumber} boxes.`
                : 'Sort and group multiple items/tags belonging to the same customer into separate shipping boxes.'
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                if (packingSessionActive) {
                  const confirmEnd = window.confirm("Are you sure you want to end this packing session? You can still view/copy your box data until you start a new session.");
                  if (confirmEnd) {
                    setPackingSessionActive(false);
                    setLastAssignedBox(null);
                    stopCamera();
                  }
                } else {
                  setPackingSessionActive(true);
                  setPackingPhoneToBoxMap({});
                  setMaxBoxNumber(0);
                  setLastAssignedBox(null);
                  setPackingHistory([]);
                  setPackingBoxesData({});
                }
              }}
              className={`btn ${packingSessionActive ? 'btn-danger-outline' : 'btn-primary'}`}
              style={{
                padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700,
                border: packingSessionActive ? '1px solid rgba(244, 63, 94, 0.4)' : 'none',
                background: packingSessionActive ? 'transparent' : 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
                color: packingSessionActive ? 'var(--accent-rose)' : '#ffffff'
              }}
            >
              {packingSessionActive ? '⏹️ End Packing Session' : '▶️ Start Packing Session'}
            </button>
            {Object.keys(packingBoxesData).length > 0 && (
              <button type="button" onClick={() => setShowExportModal(true)} className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: 700, border: '1px solid var(--border-light)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                📋 Ask for Box Info
              </button>
            )}
          </div>
        </div>

        {packingSessionActive && lastAssignedBox && (
          <div style={{
            marginTop: '16px',
            background: lastAssignedBox.isNew ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99,102,241,0.08)',
            border: lastAssignedBox.isNew ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(99,102,241,0.25)',
            borderRadius: '12px', padding: '16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', animation: 'fadeIn 0.35s ease'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Scan Result Assignment</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: lastAssignedBox.isNew ? '#10b981' : '#a5b4fc', margin: '8px 0' }}>
              PLACE IN BOX #{lastAssignedBox.boxNumber}
            </div>
            {lastAssignedBox.isNew && (
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700, marginBottom: '8px' }}>🆕 NEW BOX CREATED</span>
            )}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Tag: <strong style={{ fontFamily: 'monospace' }}>#{lastAssignedBox.tagId}</strong> · Customer: <strong>{lastAssignedBox.customerName}</strong>
            </div>
          </div>
        )}

        {packingSessionActive && packingHistory.length > 0 && (
          <div style={{ marginTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>Session History (Last 5 scans)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
              {packingHistory.slice(0, 5).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', padding: '6px 10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', opacity: 0.8, marginRight: '8px' }}>#{item.tagId}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.isNew && <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 700 }}>[NEW]</span>}
                    <span style={{ background: item.isNew ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99,102,241,0.15)', color: item.isNew ? '#10b981' : '#a5b4fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Box #{item.boxNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Camera / Upload */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        {cameraActive ? (
          <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <video id="camera-video" autoPlay playsInline muted style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--accent-indigo)', background: '#000000' }}></video>
            <button type="button" onClick={stopCamera} className="btn btn-danger-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Stop Scanning</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" onClick={startCamera} className="btn btn-primary"
              style={{ padding: '12px 20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)' }}>
              📷 Start Camera Scan
            </button>
            <button type="button" onClick={() => document.getElementById('qr-file-input').click()} className="btn btn-secondary"
              style={{ padding: '12px 20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              📁 Upload QR Image
            </button>
            <input type="file" id="qr-file-input" accept="image/*" onChange={handleUploadQrFile} style={{ display: 'none' }} />
          </div>
        )}
      </div>
      <div id="qr-file-reader" style={{ display: 'none' }}></div>

      {/* Manual Lookup Form */}
      <form onSubmit={handleLookupTag} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', maxWidth: '600px', marginBottom: '24px' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label" style={{ textAlign: 'left' }}>Or Enter Tag ID manually:</label>
          <input type="text" placeholder="e.g. a9t4k7s0 or paste full QR link" value={lookupId} onChange={(e) => setLookupId(e.target.value)}
            style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text-primary)', fontSize: '0.95rem' }} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={lookupLoading} style={{ padding: '14px 24px', fontWeight: 700, borderRadius: '10px', height: '49px' }}>
          {lookupLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {lookupError && (
        <div className="status-msg status-msg-error" style={{ maxWidth: '600px', marginBottom: '24px' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} /><span>{lookupError}</span>
        </div>
      )}

      {showAddTagOption && (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 24px auto', padding: '20px', border: '1px dashed var(--accent-indigo)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'center' }}>
            Would you like to register Tag ID <strong style={{ color: 'var(--accent-indigo)' }}>#{showAddTagOption}</strong> into the database?
          </span>
          <button type="button" onClick={() => handleAddMissingTag(showAddTagOption)} className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)' }}>
            ➕ Add Tag into Database
          </button>
        </div>
      )}

      {/* Lookup Result Card */}
      {lookupResult && (
        <div style={{ maxWidth: '500px', margin: '0 auto', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px', textAlign: 'left', animation: 'fadeIn 0.35s ease' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tag Found</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>#{lookupResult.tagId}</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Customer Name', value: lookupResult.customerName, big: false },
              { label: 'Total Quantity Ordered', value: `${lookupResult.totalQuantity} items`, big: true },
            ].map(({ label, value, big }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 18px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</span>
                <span style={{ fontSize: big ? '1.8rem' : '1.2rem', fontWeight: big ? 800 : 700, color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 18px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Ordered Phone Number</span>
              <a href={`tel:${lookupResult.orderedPhoneNumber}`} style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-indigo)', textDecoration: 'none' }}>{lookupResult.orderedPhoneNumber}</a>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px 18px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Ordered Email</span>
              <a href={`mailto:${lookupResult.orderedEmail}`} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-indigo)', textDecoration: 'none', wordBreak: 'break-all' }}>{lookupResult.orderedEmail}</a>
            </div>
          </div>

          {/* Delete User Data */}
          {lookupResult.tagStatus === 'registered' && (
            <div style={{ marginTop: '8px', padding: '16px 18px', background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>⚠️ Registered Tag</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 12px 0' }}>
                This QR has user data saved on it{lookupResult.tagName ? ` (${lookupResult.tagName})` : ''}. To reset it as a fresh unregistered tag, delete the user data below.<br />
                <span style={{ opacity: 0.7 }}>Order info (phone, email, order ID) will <strong>not</strong> be deleted.</span>
              </p>
              {resetSuccess && <div className="status-msg status-msg-success" style={{ marginBottom: '10px', fontSize: '0.82rem', padding: '8px 12px' }}><CheckCircle2 size={15} /><span>{resetSuccess}</span></div>}
              {resetError && <div className="status-msg status-msg-error" style={{ marginBottom: '10px', fontSize: '0.82rem', padding: '8px 12px' }}><AlertTriangle size={15} /><span>{resetError}</span></div>}

              {!showResetConfirm ? (
                <button type="button" onClick={() => setShowResetConfirm(true)} className="btn btn-danger-outline"
                  style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderColor: 'rgba(244,63,94,0.4)', color: 'var(--accent-rose)' }}>
                  <Trash2 size={15} /> Delete User Data (Reset to Fresh)
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--accent-rose)', fontWeight: 600, textAlign: 'center', margin: 0 }}>Are you sure? This will clear the name, phone, socials and password from this tag.</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setShowResetConfirm(false)} className="btn" disabled={resetLoading}
                      style={{ flex: 1, padding: '9px', fontSize: '0.82rem', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)' }}>Cancel</button>
                    <button type="button" onClick={handleResetTagData} className="btn" disabled={resetLoading}
                      style={{ flex: 1, padding: '9px', fontSize: '0.82rem', background: 'var(--accent-rose)', border: 'none', color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {resetLoading ? <><div className="spinner" style={{ width: '13px', height: '13px', borderWidth: '2px', borderTopColor: '#fff' }} /> Clearing...</> : <><Trash2 size={14} /> Yes, Delete Data</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {lookupResult.tagStatus === 'unregistered' && resetSuccess && (
            <div className="status-msg status-msg-success" style={{ marginTop: '8px', fontSize: '0.82rem' }}>
              <CheckCircle2 size={15} /><span>{resetSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Export Box Info Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.25s ease' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>📋 Exported Box Information</h3>
              <button type="button" onClick={() => setShowExportModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>Copy the text below and paste it directly to ChatGPT along with your shipping labels PDF text.</p>
            <textarea
              readOnly
              value={Object.entries(packingBoxesData).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([boxNum, data]) => `BOX ${boxNum}\nName: ${data.customerName}\nPhone: ${data.orderedPhoneNumber}\nAddress: ${data.address}\nTags in box: ${data.tags.join(', ')}\n---------------------------------------------`).join('\n\n')}
              style={{ width: '100%', height: '250px', background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '16px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none', outline: 'none', lineHeight: '1.5' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700 }}
                onClick={() => { navigator.clipboard.writeText(Object.entries(packingBoxesData).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([boxNum, data]) => `BOX ${boxNum}\nName: ${data.customerName}\nPhone: ${data.orderedPhoneNumber}\nAddress: ${data.address}\nTags in box: ${data.tags.join(', ')}\n---------------------------------------------`).join('\n\n')); alert("Copied box info to clipboard!"); }}>
                Copy to Clipboard
              </button>
              <button type="button" onClick={() => setShowExportModal(false)} className="btn btn-confirm-no" style={{ padding: '10px 20px', fontSize: '0.85rem', fontWeight: 700 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanFinderTab;
