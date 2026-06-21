import { useState, useEffect, useRef, useCallback } from 'react';
import { Tag, MapPin, Globe, ShoppingBag, Sparkles } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '../firebase';
import { ensureQrLib, makeQR, drawDot, drawFinder, drawBanner } from '../utils/qrDrawer';
import './LandingPage.css';

/* ── Keyring SVG ── */
const KeyringSvg = ({ width = 50, height = 96, marginBottom = '-32px' }) => (
  <svg width={width} height={height} viewBox="0 0 60 115" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom, zIndex: 5, position: 'relative' }}>
    <circle cx="30" cy="20" r="16" stroke="url(#metal-grad-landing)" strokeWidth="4" fill="none" filter="drop-shadow(0px 3px 3px rgba(0,0,0,0.35))" />
    <circle cx="30" cy="20" r="14.25" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" fill="none" />
    <rect x="27.5" y="34" width="5" height="12" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="43" width="5" height="12" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" transform="rotate(15, 30, 49)" />
    <rect x="27.5" y="52" width="5" height="12" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="61" width="5" height="12" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" transform="rotate(-15, 30, 67)" />
    <rect x="27.5" y="70" width="5" height="12" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="79" width="5" height="16" rx="2.5" stroke="url(#metal-grad-landing)" strokeWidth="2.5" fill="none" filter="drop-shadow(0px 1.5px 2px rgba(0,0,0,0.35))" />
    <defs>
      <linearGradient id="metal-grad-landing" x1="14" y1="6" x2="46" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="25%" stopColor="#9ca3af" />
        <stop offset="50%" stopColor="#d1d5db" />
        <stop offset="75%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Helper: draw branded QR code (matching admin) ── */
function drawBrandedQr(uploadedImg, presetOptions) {
  if (typeof window.qrcode === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  let qrResult;
  try {
    qrResult = makeQR('https://im-here-qr.vercel.app/id?=preview');
  } catch (err) {
    console.warn("makeQR failed in preview:", err);
    return null;
  }

  const { qr } = qrResult;
  const moduleCount = qr.getModuleCount();

  const qrSize = 640;
  const margin = 1.5;
  const totalModules = moduleCount + margin * 2;
  const moduleSize = qrSize / totalModules;
  const bannerH = 60;

  const dotColor = presetOptions.dotColor || '#ffffff';
  const bgColor = presetOptions.bgColor || '#000000';
  const overlayDarkness = presetOptions.overlayDarkness !== undefined ? presetOptions.overlayDarkness : 40;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (uploadedImg) {
    try {
      ctx.drawImage(uploadedImg, 0, 0, canvas.width, canvas.height);
      if (overlayDarkness > 0) {
        ctx.fillStyle = `rgba(0,0,0,${overlayDarkness / 100})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn("Failed to draw background image:", e);
    }
  }

  // Draw dots
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const isFinder = (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);
      if (isFinder) continue;
      if (qr.isDark(row, col)) {
        drawDot(ctx, row, col, margin, moduleSize, dotColor, 'circle', bannerH, 0.8);
      }
    }
  }

  // Draw corners
  drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
  drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
  drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);

  // Draw banner frame (at the top)
  drawBanner(ctx, qrSize, bannerH, "SCAN ME TO FIND ME", '#000000', '#ffffff', 0);

  return canvas;
}

/* ── Hanging Keychain Subcomponent ── */
const HangingKeychain = ({ tagId, base64Image, label, index }) => {
  const [flipped, setFlipped] = useState(false);
  const canvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(null);

  // Load background image with robust fallbacks (Firestore, public folder cropped, and default logo)
  useEffect(() => {
    const loadAttempts = [];

    // Prioritize pic1, pic2, pic3 directly so they load instantly
    if (tagId === 'tag1') {
      loadAttempts.push('/pic1.png');
      if (base64Image && base64Image.trim() !== '') {
        loadAttempts.push(base64Image);
      }
      loadAttempts.push('/logo icon.png');
    } else if (tagId === 'tag2') {
      loadAttempts.push('/pic2.png');
      if (base64Image && base64Image.trim() !== '') {
        loadAttempts.push(base64Image);
      }
      loadAttempts.push('/customised.png');
    } else if (tagId === 'tag3') {
      loadAttempts.push('/pic3.png');
      if (base64Image && base64Image.trim() !== '') {
        loadAttempts.push(base64Image);
      }
      loadAttempts.push('/logo icon.png');
    }

    let attemptIndex = 0;

    const tryNext = () => {
      if (attemptIndex >= loadAttempts.length) {
        setImgLoaded(null);
        return;
      }

      const currentSrc = loadAttempts[attemptIndex];
      attemptIndex++;

      const tempImg = new Image();
      tempImg.onload = () => {
        setImgLoaded(tempImg);
      };
      tempImg.onerror = () => {
        console.warn(`HangingKeychain (${tagId}): Failed to load image from source: ${currentSrc}. Trying next fallback...`);
        tryNext();
      };
      tempImg.src = currentSrc;
    };

    tryNext();
  }, [base64Image, tagId]);

  // Load logo image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoLoaded(img);
    img.src = '/full logo.png';
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 640;
    const H = 700;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (flipped) {
      // Draw back side
      if (imgLoaded) {
        ctx.drawImage(imgLoaded, 0, 0, W, H);
        ctx.fillStyle = "rgba(0,0,0,0.45)"; // overlay darkness
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#0f172a'; // Slate background if no image
        ctx.fillRect(0, 0, W, H);
      }

      // Draw brand logo
      if (logoLoaded) {
        ctx.drawImage(logoLoaded, 0, 0, W, H);
      }
    } else {
      // Draw front side (Branded QR)
      const qrCanvas = drawBrandedQr(imgLoaded, {
        dotColor: '#ffffff',
        bgColor: '#000000',
        overlayDarkness: 40
      });
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 0, 0);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
      }
    }
  }, [flipped, imgLoaded, logoLoaded]);

  useEffect(() => {
    ensureQrLib().then(() => {
      draw();
    });
  }, [draw]);

  const handlePreviewClick = () => {
    window.open('/id?=preview', '_blank');
  };

  const swingClass = `keychain-idle-swing swing-phase-${index} ${flipped ? 'flipped' : ''}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div className={swingClass}>
        <div className={`hanging-keychain-wrapper ${flipped ? 'flipped' : ''}`} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: flipped ? 'flex-start' : 'flex-end' }} onClick={handlePreviewClick} title="Click to test recovery scan">
          <KeyringSvg />
          <div style={{ position: 'relative' }}>
            <canvas ref={canvasRef} className="keychain-canvas" style={{ width: '180px', height: '197px', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }} />
            <div className="tag-hole-eyelet" style={{
              position: 'absolute',
              top: '8px',
              right: flipped ? 'auto' : '16px',
              left: flipped ? '16px' : 'auto',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2.5px solid #cbd5e1',
              background: '#0a0a0a',
              boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)',
              zIndex: 6
            }} />
          </div>
        </div>
      </div>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <button
        onClick={() => setFlipped(f => !f)}
        className="btn-flip-preview"
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(0, 0, 0, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.12)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        Flip Tag
      </button>
    </div>
  );
};

/* ── Main Landing Page Component ── */
const LandingPage = ({ firestoreDb, setFirestoreDb }) => {
  const [db, setDb] = useState(firestoreDb);
  const [fetchingLandingQrs, setFetchingLandingQrs] = useState(true);
  const [landingQrs, setLandingQrs] = useState({
    tag1: { label: 'Your Pet', base64Image: '/pic1.png', visible: true },
    tag2: { label: 'Your Memory', base64Image: '/pic2.png', visible: true },
    tag3: { label: 'Your Art', base64Image: '/pic3.png', visible: true }
  });

  // Dynamic DB Initialization
  useEffect(() => {
    if (db) return;

    const initDb = async () => {
      let config = null;
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        config = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
          measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
        };
      } else {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            config = data.config;
          }
        } catch (e) {
          console.error("Failed to load Firebase config:", e);
        }
      }

      if (config && config.apiKey) {
        try {
          const dbInstance = initializeFirebase(config);
          setDb(dbInstance);
          if (setFirestoreDb) {
            setFirestoreDb(dbInstance);
          }
        } catch (err) {
          console.error("Firebase init failed in LandingPage:", err);
          setFetchingLandingQrs(false);
        }
      } else {
        setFetchingLandingQrs(false);
      }
    };

    initDb();
  }, [db, firestoreDb, setFirestoreDb]);

  // Load configured Landing QRs from Firestore
  useEffect(() => {
    if (!db) return;

    const fetchLandingQrs = async () => {
      try {
        const docRef = doc(db, 'settings', 'landing_page_qrs');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLandingQrs({
            tag1: {
              label: data.tag1?.label || 'Your Pet',
              base64Image: data.tag1?.base64Image || '/pic1.png',
              visible: data.tag1?.visible !== undefined ? data.tag1.visible : true
            },
            tag2: {
              label: data.tag2?.label || 'Your Memory',
              base64Image: data.tag2?.base64Image || '/pic2.png',
              visible: data.tag2?.visible !== undefined ? data.tag2.visible : true
            },
            tag3: {
              label: data.tag3?.label || 'Your Art',
              base64Image: data.tag3?.base64Image || '/pic3.png',
              visible: data.tag3?.visible !== undefined ? data.tag3.visible : true
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch settings/landing_page_qrs from Firestore:", err);
      } finally {
        setFetchingLandingQrs(false);
      }
    };

    fetchLandingQrs();
  }, [db]);

  // Scroll Reveal hook
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => observer.observe(el));

    return () => {
      revealElements.forEach(el => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="app-container" style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', gap: '32px', alignSelf: 'center', paddingTop: '16px' }}>
      {/* Top-right Order Now button */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', paddingBottom: '4px', marginTop: '12px' }}>
        <a
          href="/orders"
          id="btn-order-now-top"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            transition: 'all 0.25s',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.2)';
          }}
        >
          <ShoppingBag size={16} /> Order Now
        </a>
      </div>

      <header className="header reveal-on-scroll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '-20px' }}>
        {/* Logo */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <img
            src="/full logo.png"
            alt="I'm here Logo"
            style={{
              width: '260px',
              height: 'auto',
              borderRadius: '16px',
              transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.06) rotate(1deg)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1) rotate(0deg)'}
          />
        </div>

        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #0f172a 20%, #4f46e5 60%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px', letterSpacing: '-0.03em', lineHeight: '1.25', paddingBottom: '0.1em' }}>
          Smart & Customizable QR Tags
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '540px', lineHeight: '1.6', margin: '0 auto' }}>
          Securely connect your physical belongings to your digital space. No apps to download. Just scan, claim, and protect your items.
        </p>
      </header>

      {/* Hanging Keychains Section (Interactive Product Showcase) */}
      <div className="reveal-on-scroll" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '40px',
        flexWrap: 'wrap',
        margin: '-30px auto 16px auto',
        width: '100%',
        padding: '20px',
        borderBottom: '1px solid var(--border-light)',
        paddingBottom: '24px',
        minHeight: '342px'
      }}>
        {fetchingLandingQrs ? (
          <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center', width: '100%', height: '300px' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--accent-indigo)' }} />
          </div>
        ) : (
          <>
            {landingQrs.tag1?.visible !== false && (
              <HangingKeychain tagId="tag1" base64Image={landingQrs.tag1?.base64Image} label={landingQrs.tag1?.label} index={1} />
            )}
            {landingQrs.tag2?.visible !== false && (
              <HangingKeychain tagId="tag2" base64Image={landingQrs.tag2?.base64Image} label={landingQrs.tag2?.label} index={2} />
            )}
            {landingQrs.tag3?.visible !== false && (
              <HangingKeychain tagId="tag3" base64Image={landingQrs.tag3?.base64Image} label={landingQrs.tag3?.label} index={3} />
            )}
          </>
        )}
      </div>

      <h2 className="reveal-on-scroll" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0px', marginBottom: '-8px', background: 'linear-gradient(135deg, #0f172a 40%, #f43f5e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        The Problem
      </h2>

      {/* Problem Section */}
      <div className="problem-grid">
        {/* Problem Card 1 */}
        <div className="glass-panel reveal-on-scroll delay-100" style={{
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'justify',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.45)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.15)'}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '400px', background: 'rgba(0,0,0,0.2)' }}>
            <img
              src="/problem s1.png"
              alt="Lost items situation"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
              Lost belongings are a common part of everyday life. From forgotten keys to misplaced bags, small mistakes can quickly become frustrating problems.
            </p>
          </div>
        </div>

        {/* Problem Card 2 */}
        <div className="glass-panel reveal-on-scroll delay-200" style={{
          padding: '20px',
          borderRadius: '16px',
          textAlign: 'justify',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.45)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.15)'}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '400px', background: 'rgba(0,0,0,0.2)' }}>
            <img
              src="/problem s2.png"
              alt="Helpful finder situation"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div>
            <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
              Many people notice lost belongings and genuinely want to help, but with no way to identify or contact the owner, they simply leave them where they found them.
            </p>
          </div>
        </div>
      </div>

      <h2 className="reveal-on-scroll" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '32px', marginBottom: '-8px', background: 'linear-gradient(135deg, #0f172a 40%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        How It Works
      </h2>

      {/* Feature Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        width: '100%',
        marginTop: '20px'
      }}>
        {/* Card 1 */}
        <div className="glass-panel reveal-on-scroll delay-100" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', marginBottom: '16px' }}>
            <Tag size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Attach & Protect</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            Secure your valuables with a smart recovery tag. If your item ever goes missing, anyone who finds it can scan the tag to instantly initiate a secure return process.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel reveal-on-scroll delay-200" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
            <MapPin size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Instant Location Ping</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            No need to wait for a phone call to connect. With a single tap, finders can instantly drop their current GPS location, sending an immediate alert straight to your phone.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-panel reveal-on-scroll delay-300" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
          <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', marginBottom: '16px' }}>
            <Globe size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Instant Call & Connect</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', textAlign: 'justify' }}>
            Finders can easily call, email, or message you directly through a simple contact interface. You stay connected and get your items back quickly, without exposing your private details.
          </p>
        </div>
      </div>

      {/* Why Us Section */}
      <h2 className="reveal-on-scroll" style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '40px', marginBottom: '-8px', background: 'linear-gradient(135deg, #0f172a 40%, #7c3aed 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Why Us?
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        width: '100%',
        marginTop: '20px'
      }}>
        {/* Ordinary QR Codes Card */}
        <div className="glass-panel reveal-on-scroll delay-100" style={{
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'left',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          opacity: 0.7,
          transition: 'all 0.3s ease'
        }}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '240px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/ordinary_qr.png"
              alt="Ordinary QR Code"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>Ordinary QR Codes</h3>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '16px' }}>Cold, Clinical, and Generic.</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
            Traditional black-and-white matrix codes look like barcodes on a shipping label. They ruin the aesthetic of your favorite keys, designer bags, or custom wallets, making security feel like a chore rather than a lifestyle choice.
          </p>
        </div>

        {/* Custom Aesthetic QRs Card */}
        <div className="glass-panel reveal-on-scroll delay-200" style={{
          padding: '24px',
          borderRadius: '16px',
          textAlign: 'left',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
          transition: 'all 0.3s ease'
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.5)';
            e.currentTarget.style.boxShadow = '0 12px 36px 0 rgba(6, 182, 212, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(99, 102, 241, 0.15)';
          }}>
          <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '240px', background: 'rgba(255,255,255,0.02)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src="/customised.png"
              alt="Custom Aesthetic QR Code"
              style={{ height: '100%', width: 'auto', aspectRatio: '1', objectFit: 'contain', borderRadius: '16px' }}
            />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', background: 'linear-gradient(135deg, #0f172a 40%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Custom Aesthetic QRs</h3>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '16px' }}>Your Favorite Visuals. Your Safety Net.</h4>
          <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6', textAlign: 'justify' }}>
            We don't just generate codes; we embed them. Blend your high-contrast QR matrix seamlessly over a picture of your pet, a favorite memory, or custom artwork. It acts as a stunning personal accessory that solves the "what if it's lost" problem beautifully behind the scenes.
          </p>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="reveal-on-scroll" style={{
        width: '100%',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.07) 50%, rgba(139,92,246,0.1) 100%)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 900, background: 'linear-gradient(135deg, #0f172a 30%, #4f46e5 70%, #0891b2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: '1.25', paddingBottom: '0.1em' }}>
          Ready to protect your belongings?
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '400px', lineHeight: '1.6', margin: 0 }}>
          Order your personalised or classic I'm Here Smart QR tag today.
        </p>
        <a
          href="/orders"
          id="btn-order-now-bottom"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 36px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            color: 'white',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '1.05rem',
            borderRadius: '14px',
            boxShadow: '0 6px 24px rgba(99,102,241,0.4)',
            transition: 'all 0.25s',
            marginTop: '4px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 10px 32px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.4)';
          }}
        >
          <ShoppingBag size={20} /> Order Your Tag →
        </a>
      </div>

      {/* Footer info */}
      <footer className="policy-footer" style={{ marginTop: '36px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
          © 2026 I'M HERE. Reuniting belongings with their owners.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          <a href="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#4f46e5'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Terms & Conditions</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#4f46e5'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Privacy Policy</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/shipping_policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#4f46e5'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Shipping Policy</a>
          <span style={{ color: 'var(--border-light)' }}>•</span>
          <a href="/refund_policy" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#4f46e5'} onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>Refund Policy</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
