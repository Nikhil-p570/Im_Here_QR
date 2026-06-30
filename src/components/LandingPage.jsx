/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { initializeFirebase } from '../firebase';
import { ensureQrLib, makeQR, drawDot, drawFinder, drawBanner } from '../utils/qrDrawer';
import './LandingPage.css';

// ── QR Drawing Helper ──────────────────────────────────────────────
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
    console.warn('makeQR failed in preview:', err);
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
  const yOffset = presetOptions.yOffset || 0;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (uploadedImg) {
    try {
      ctx.drawImage(uploadedImg, 0, yOffset, canvas.width, canvas.height);
      if (overlayDarkness > 0) {
        ctx.fillStyle = `rgba(0,0,0,${overlayDarkness / 100})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn('Failed to draw background image:', e);
    }
  }
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const isFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= moduleCount - 7) ||
        (row >= moduleCount - 7 && col < 7);
      if (isFinder) continue;
      if (qr.isDark(row, col)) {
        drawDot(ctx, row, col, margin, moduleSize, dotColor, 'circle', bannerH, 0.8);
      }
    }
  }
  drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
  drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
  drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
  drawBanner(ctx, qrSize, bannerH, 'SCAN ME TO FIND ME', '#000000', '#ffffff', 0);
  return canvas;
}

// ── Keyring SVG ────────────────────────────────────────────────────
const KeyringSvg = () => (
  <svg width="40" height="80" viewBox="0 0 60 115" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ marginBottom: '-26px', zIndex: 5, position: 'relative' }}>
    <circle cx="30" cy="20" r="16" stroke="url(#metal-grad-lp)" strokeWidth="4" fill="none" filter="drop-shadow(0px 3px 3px rgba(0,0,0,0.35))" />
    <circle cx="30" cy="20" r="14.25" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" fill="none" />
    <rect x="27.5" y="34" width="5" height="12" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.2" fill="none" />
    <rect x="27.5" y="43" width="5" height="12" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.2" fill="none" transform="rotate(15, 30, 49)" />
    <rect x="27.5" y="52" width="5" height="12" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.2" fill="none" />
    <rect x="27.5" y="61" width="5" height="12" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.2" fill="none" transform="rotate(-15, 30, 67)" />
    <rect x="27.5" y="70" width="5" height="12" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.2" fill="none" />
    <rect x="27.5" y="79" width="5" height="16" rx="2.5" stroke="url(#metal-grad-lp)" strokeWidth="2.5" fill="none" />
    <defs>
      <linearGradient id="metal-grad-lp" x1="14" y1="6" x2="46" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="25%" stopColor="#9ca3af" />
        <stop offset="50%" stopColor="#d1d5db" />
        <stop offset="75%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Single Keychain Card (3D Flip) ─────────────────────────────────
const KeychainCard = ({ tagId, base64Image, label, version, isActive, hideUI }) => {
  const [isFlipped, setIsFlipped] = useState(version === 2);

  useEffect(() => {
    setIsFlipped(version === 2);
  }, [version]);
  const frontCanvasRef = useRef(null);
  const backCanvasRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(null);
  const [logoIconLoaded, setLogoIconLoaded] = useState(null);
  const [qrLibReady, setQrLibReady] = useState(typeof window.qrcode !== 'undefined');

  useEffect(() => {
    let active = true;
    const loadAttempts = [];
    if (tagId === 'tag1') {
      loadAttempts.push('/pic1.png');
      if (base64Image && base64Image.trim() !== '') loadAttempts.push(base64Image);
      loadAttempts.push('/logo icon black.png');
    } else if (tagId === 'tag2') {
      loadAttempts.push('/pic2.png');
      if (base64Image && base64Image.trim() !== '') loadAttempts.push(base64Image);
      loadAttempts.push('/customised.png');
    } else if (tagId === 'tag3') {
      loadAttempts.push('/pic3.png');
      if (base64Image && base64Image.trim() !== '') loadAttempts.push(base64Image);
      loadAttempts.push('/logo icon black.png');
    }
    let idx = 0;
    const tryNext = () => {
      if (!active || idx >= loadAttempts.length) return;
      const src = loadAttempts[idx++];
      const img = new Image();
      img.onload = () => { if (active) setImgLoaded(img); };
      img.onerror = () => tryNext();
      img.src = src;
    };
    tryNext();
    return () => { active = false; };
  }, [base64Image, tagId]);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => { if (active) setLogoLoaded(img); };
    img.src = '/full logo black.png';
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => { if (active) setLogoIconLoaded(img); };
    img.src = '/logo icon black.png';
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (qrLibReady) return;
    ensureQrLib().then(() => setQrLibReady(true));
  }, []);

  const drawFace = useCallback((canvasRef, isFrontSide) => {
    const canvas = canvasRef.current;
    if (!canvas || !qrLibReady) return;
    const W = 640, H = 700;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (isFrontSide) {
      const bgImg = version === 2 ? logoIconLoaded : imgLoaded;
      const qrCanvas = drawBrandedQr(bgImg, {
        dotColor: '#ffffff',
        bgColor: '#000000',
        overlayDarkness: version === 2 ? 40 : 40,
        yOffset: version === 2 ? 35 : 0,
      });
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 0, 0);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      if (version === 2) {
        if (imgLoaded) {
          ctx.drawImage(imgLoaded, 0, 0, W, H);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        if (imgLoaded) {
          ctx.drawImage(imgLoaded, 0, 0, W, H);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(0, 0, W, H);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, W, H);
        }
        if (logoLoaded) {
          ctx.drawImage(logoLoaded, 0, 0, W, H);
        }
      }
    }
  }, [imgLoaded, logoLoaded, logoIconLoaded, version, qrLibReady]);

  useEffect(() => {
    drawFace(frontCanvasRef, true);
    drawFace(backCanvasRef, false);
  }, [drawFace]);

  const handleCardClick = () => {
    if (window.innerWidth < 768) {
      setIsFlipped(prev => !prev);
    } else {
      if (isActive) window.open('/id?=preview', '_blank');
    }
  };

  return (
    <div className="lp-keychain-wrapper">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="lp-keychain-scene">
          <div className={`lp-keychain-card ${isFlipped ? 'is-flipped' : ''}`}>

            {/* The keyring is anchored to the card itself, so it flips in 3D with the card */}
            <div style={{ position: 'absolute', top: '-54px', right: '0px', zIndex: 10, transform: 'translateZ(1px)' }}>
              <KeyringSvg />
            </div>

            <div className="lp-keychain-face front"
              style={{ cursor: isActive ? 'pointer' : 'default' }}
              onClick={handleCardClick}
              title={isActive ? 'Click to preview recovery scan' : ''}>
              <canvas ref={frontCanvasRef} style={{ width: '100%', height: '100%' }} />
              <div style={{
                position: 'absolute', top: '10px', right: '14px',
                width: '11px', height: '11px', borderRadius: '50%',
                border: '2.5px solid #cbd5e1', background: '#0a0a0a',
                boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.8)',
              }} />
            </div>
            <div className="lp-keychain-face back"
              style={{ cursor: isActive ? 'pointer' : 'default' }}
              onClick={handleCardClick}>
              <canvas ref={backCanvasRef} style={{ width: '100%', height: '100%' }} />
              <div style={{
                position: 'absolute', top: '10px', left: '14px',
                width: '11px', height: '11px', borderRadius: '50%',
                border: '2.5px solid #cbd5e1', background: '#0a0a0a',
                boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.8)',
              }} />
            </div>
          </div>
        </div>
      </div>


      {!hideUI && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <button className="lp-flip-btn" onClick={() => setIsFlipped(f => !f)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            {isFlipped ? 'See QR Side' : 'Flip to Back'}
          </button>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.03em', fontWeight: 500 }}>
            50 mm × 50 mm
          </span>
        </div>
      )}
    </div>
  );
};

// ── Mini QR Grid (decorative) ─────────────────────────────────────
const MiniQRGrid = () => {
  const pattern = [
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0,
    0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0,
    1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1,
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(17, 1fr)',
      gap: '2px',
      width: '100%',
      height: '100%',
      padding: '8px',
    }}>
      {pattern.map((cell, i) => (
        <div key={i} style={{
          aspectRatio: '1',
          background: cell ? '#fff' : 'transparent',
          borderRadius: '1px',
        }} />
      ))}
    </div>
  );
};

// ── Hero Visual ────────────────────────────────────────────────────
const HeroVisual = () => {
  const [floatY, setFloatY] = useState(0);

  useEffect(() => {
    let frame;
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      setFloatY(Math.sin(elapsed * 0.9) * 10);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="lp-hero-visual">
      <div style={{ transform: `translateY(${floatY}px)`, transition: 'transform 0.1s ease', position: 'relative' }}>
        <div className="lp-hero-phone-mockup">
          <div className="lp-hero-phone-notch" />
          <div className="lp-hero-phone-screen">
            <div style={{ textAlign: 'center', marginBottom: '12px', marginTop: '16px' }}>
              <img src="/full logo black.png" alt="Logo" style={{ height: '40px', borderRadius: '8px' }} />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>Hey there! Looking for me? 👀</h3>
              <p style={{ fontSize: '0.6rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                You just scanned a piece of my physical world. Want to get in touch or return a lost item?
              </p>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Owner Name Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b', marginBottom: '2px' }}>Owner Name</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>John Doe</div>
              </div>

              {/* Phone Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.55rem', color: '#64748b', marginBottom: '2px' }}>Primary Phone</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4F46E5' }}>+91 XXXXX-XXXXX</div>
                </div>
                <div style={{ background: '#6366f1', color: '#fff', borderRadius: '6px', padding: '6px 10px', fontSize: '0.65rem', fontWeight: 700 }}>
                  📞 Make a call
                </div>
              </div>

              {/* Drop Location Card */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
                <div style={{ fontSize: '0.55rem', color: '#64748b', marginBottom: '6px' }}>Drop Location</div>
                <div style={{ background: '#059669', color: '#fff', borderRadius: '6px', padding: '8px', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                  🌐 Drop Location 📍
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-hero-qr-tag">
          <MiniQRGrid />
          <p style={{ fontSize: '0.5rem', color: '#fff', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>
            SCAN ME TO FIND ME
          </p>
        </div>

        <div className="lp-hero-floating-badge badge-scan">
          <span className="badge-dot" style={{ background: '#22D3EE' }} />
          QR Scanned
        </div>
        <div className="lp-hero-floating-badge badge-found">
          <span className="badge-dot" style={{ background: '#10b981' }} />
          Owner Found
        </div>
        <div className="lp-hero-floating-badge badge-connect">
          <span className="badge-dot" style={{ background: '#4F46E5' }} />
          Connected
        </div>
      </div>
    </div>
  );
};

// ── Product Carousel (circular / reflective) ──────────────────────
const ProductCarousel = ({ landingQrs, fetchingLandingQrs }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(null);

  const [activeVersion, setActiveVersion] = useState(1);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const items = [
    { id: 'tag1', base64Image: landingQrs.tag1?.base64Image },
    { id: 'tag2', base64Image: landingQrs.tag2?.base64Image },
    { id: 'tag3', base64Image: landingQrs.tag3?.base64Image },
  ].filter((item) => landingQrs[item.id]?.visible !== false);

  const prev = () => setActiveIdx(i => (i - 1 + items.length) % items.length);
  const next = () => setActiveIdx(i => (i + 1) % items.length);


  if (fetchingLandingQrs) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px' }}>
        <div className="lp-spinner" />
      </div>
    );
  }

  const toggleUI = (
    <div className="lp-version-toggle-container">
      <div className="lp-version-toggle">
        <div
          className="lp-version-toggle-bg"
          style={{ transform: `translateX(${activeVersion === 1 ? '0%' : '100%'})` }}
        />
        <button
          className={`lp-version-toggle-btn ${activeVersion === 1 ? 'active' : ''}`}
          onClick={() => setActiveVersion(1)}
        >
          Photo-Front
        </button>
        <button
          className={`lp-version-toggle-btn ${activeVersion === 2 ? 'active' : ''}`}
          onClick={() => setActiveVersion(2)}
        >
          Photo-Back
        </button>
      </div>
    </div>
  );

  const getItemStyle = (i) => {
    const total = items.length;
    let diff = i - activeIdx;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;

    const absDiff = Math.abs(diff);

    // Show up to 2 on each side
    if (absDiff > 2) {
      return { display: 'none' };
    }

    // Position/style per distance from center (adapted for mobile screen sizes)
    const xOffsets = isMobile ? [0, 80, 150] : [0, 155, 278];
    const zOffsets = isMobile ? [0, -60, -110] : [0, -90, -160];
    const scales = isMobile ? [1, 0.72, 0.54] : [1, 0.80, 0.62];
    const opacities = [1, 0.55, 0.28];
    const rotateYs = [0, -12, -20];

    const sign = diff >= 0 ? 1 : -1;
    const xOffset = sign * xOffsets[absDiff];
    const zOffset = zOffsets[absDiff];
    const rotateY = sign * rotateYs[absDiff];
    const scale = scales[absDiff];
    const opacity = opacities[absDiff];

    return {
      transform: `translateX(${xOffset}px) translateZ(${zOffset}px) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex: 10 - absDiff,
      pointerEvents: absDiff === 0 ? 'auto' : 'none',
      position: 'absolute',
      transition: 'all 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  return (
    <>
      {toggleUI}
      <div
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchStartX.current === null) return;
          const delta = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
          touchStartX.current = null;
        }}
      >
        {/* Stage for the 3D track */}
        <div className="lp-carousel-stage">
          <button className="lp-carousel-nav prev" onClick={prev} aria-label="Previous tag">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>

          <div className="lp-carousel-track-3d">
            {items.map((item, i) => {
              const style = getItemStyle(i);
              if (style.display === 'none') return null;
              return (
                <div key={item.id} style={style}>
                  <KeychainCard
                    tagId={item.id}
                    base64Image={item.base64Image}
                    version={activeVersion}
                    isActive={i === activeIdx}
                  />
                </div>
              );
            })}
          </div>

          <button className="lp-carousel-nav next" onClick={next} aria-label="Next tag">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* Dots below stage, above reflection */}
        <div className="lp-carousel-dots" style={{ marginTop: '16px' }}>
          {items.map((_, i) => (
            <button
              key={i}
              className={`lp-carousel-dot ${i === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
              aria-label={`Go to tag ${i + 1}`}
            />
          ))}
        </div>

        {/* Reflection */}
        <div className="lp-carousel-reflection" />

        <p className="lp-carousel-preview-hint">
          {isMobile ? "Swipe to browse · Tap card to flip" : "Click the active tag to preview a recovery scan"}
        </p>
      </div>
    </>
  );
};

// ── Scroll Reveal ──────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    const els = document.querySelectorAll('.lp-reveal');
    els.forEach(el => observer.observe(el));
    return () => els.forEach(el => observer.unobserve(el));
  }, []);
}

// ── Main Landing Page ──────────────────────────────────────────────
const LandingPage = ({ firestoreDb, setFirestoreDb }) => {
  const [db, setDb] = useState(firestoreDb);
  const [fetchingLandingQrs, setFetchingLandingQrs] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [landingQrs, setLandingQrs] = useState({
    tag1: { label: 'Your Pet', base64Image: '/pic1.png', visible: true },
    tag2: { label: 'Your Memory', base64Image: '/pic2.png', visible: true },
    tag3: { label: 'Your Art', base64Image: '/pic3.png', visible: true },
  });

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Firebase init
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
          measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
        };
      } else {
        try {
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            config = data.config;
          }
        } catch (e) {
          console.error('Failed to load Firebase config:', e);
        }
      }
      if (config && config.apiKey) {
        try {
          const dbInstance = initializeFirebase(config);
          setDb(dbInstance);
          if (setFirestoreDb) setFirestoreDb(dbInstance);
        } catch (err) {
          console.error('Firebase init failed in LandingPage:', err);
          setFetchingLandingQrs(false);
        }
      } else {
        setFetchingLandingQrs(false);
      }
    };
    initDb();
  }, [db, firestoreDb, setFirestoreDb]);

  // Fetch landing QRs from Firestore
  useEffect(() => {
    if (!db) return;
    const fetchLandingQrs = async () => {
      try {
        const docRef = doc(db, 'settings', 'landing_page_qrs');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLandingQrs({
            tag1: { label: data.tag1?.label || 'Your Pet', base64Image: data.tag1?.base64Image || '/pic1.png', visible: data.tag1?.visible !== undefined ? data.tag1.visible : true },
            tag2: { label: data.tag2?.label || 'Your Memory', base64Image: data.tag2?.base64Image || '/pic2.png', visible: data.tag2?.visible !== undefined ? data.tag2.visible : true },
            tag3: { label: data.tag3?.label || 'Your Art', base64Image: data.tag3?.base64Image || '/pic3.png', visible: data.tag3?.visible !== undefined ? data.tag3.visible : true },
          });
        }
      } catch (err) {
        console.warn('Failed to fetch settings/landing_page_qrs from Firestore:', err);
      } finally {
        setFetchingLandingQrs(false);
      }
    };
    fetchLandingQrs();
  }, [db]);

  return (
    <div className="lp-root">
      {/* Background grid */}
      <div className="lp-grid-bg" />

      {/* ── Navbar ── */}
      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="lp-nav-logo">
          <img src="/logo icon black.png" alt="I'm Here Logo" />
          <span className="lp-nav-logo-text">I'M HERE</span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#products">Products</a></li>
          <li><a href="#why-us">Why Us</a></li>
        </ul>
        <div className="lp-nav-cta">
          <a href="/orders" className="lp-btn-primary">Get Your Tag</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero-wrapper">
        <div className="lp-blob-1" />
        <div className="lp-blob-2" />
        <div className="lp-section">
          <div className="lp-hero-inner">
            <div>
              <div className="lp-hero-badge">
                <span className="lp-hero-badge-dot" />
                Smart & Customizable QR Tags
              </div>

              <h1 className="lp-hero-h1">
                Every lost item<br />
                <span className="highlight">deserves a way home.</span>
              </h1>

              <p className="lp-hero-desc">
                Attach a unique QR tag to your belongings. When someone finds them,
                one scan opens your secure contact profile — no app needed. The finder
                reaches you directly, and your item comes back.
              </p>

              <div className="lp-hero-actions">
                <a href="/orders" className="lp-btn-primary">
                  Get Your Tag
                </a>
                <a href="#how-it-works" className="lp-btn-secondary">
                  See How It Works
                </a>
              </div>

              <div className="lp-hero-features-row">
                <span>No app required</span>
                <span className="lp-divider-dot" />
                <span>Privacy-first</span>
                <span className="lp-divider-dot" />
                <span>Works on any phone</span>
              </div>
            </div>

            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ── What It's For ── */}
      <section className="lp-usecases-strip">
        <div className="lp-section">
          <div className="lp-usecases-inner">
            {['Keys', 'Backpacks', 'Luggage', 'Pets', 'Bicycles'].map((item, i) => (
              <span key={i} className="lp-usecase-pill">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem Section ── */}
      <section className="lp-problem-wrapper">
        <div className="lp-section">
          <div className="lp-problem-header lp-reveal">
            <span className="lp-section-eyebrow">The Problem</span>
            <h2 className="lp-section-title">Found items rarely make it back.</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto' }}>
              Someone finds your lost keys, bag, or pet — but there's no way to reach you.
              That's the gap we're closing.
            </p>
          </div>

          <div className="lp-problem-grid">
            <div className="lp-problem-card-alt lp-reveal">
              <div className="lp-problem-img-wrapper">
                <img src="/problem s1.png" alt="Lost belongings" />
              </div>
              <div className="lp-problem-text">
                <h3>The disconnect</h3>
                <p>
                  You lose something valuable. A stranger finds it and genuinely
                  wants to return it — but there's zero information on who it belongs to.
                  The item stays lost.
                </p>
              </div>
            </div>

            <div className="lp-problem-card-alt lp-reveal lp-reveal-delay-2">
              <div className="lp-problem-img-wrapper">
                <img src="/problem s2.png" alt="I'm Here solution" />
              </div>
              <div className="lp-problem-text">
                <h3>The bridge</h3>
                <p>
                  With an I'm Here tag, the finder scans the QR code and instantly sees
                  your secure profile. They reach out, share their location, and your
                  belonging is on its way back.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="lp-hiw-wrapper">
        <div className="lp-section">
          <div className="lp-hiw-header lp-reveal">
            <span className="lp-section-eyebrow">How It Works</span>
            <h2 className="lp-section-title">Simple by design.</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto' }}>
              We built this to be effortless — for you and the person who finds your stuff.
            </p>
          </div>

          <div className="lp-hiw-timeline">
            {[
              { n: '01', title: 'Get your tag', desc: 'Order a personalised QR tag. It arrives ready to use — just attach it to whatever matters to you.' },
              { n: '02', title: 'Register it', desc: 'Claim the tag through a quick registration. Add your contact details.' },
              { n: '03', title: 'Someone finds it', desc: 'When your item is found, the finder scans the QR with their phone camera. No app install, no signup — it just works.' },
              { n: '04', title: 'You reconnect', desc: 'The finder can contact you directly or share the item\'s location with a single tap.' },
            ].map((step, i) => (
              <div key={i} className={`lp-hiw-step lp-reveal lp-reveal-delay-${i + 1}`}>
                <div className="lp-hiw-step-number">{step.n}</div>
                <div className="lp-hiw-step-content">
                  <div className="lp-hiw-step-title">{step.title}</div>
                  <div className="lp-hiw-step-desc">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Carousel ── */}
      <section id="products" className="lp-carousel-wrapper">
        <div className="lp-section">
          <div className="lp-carousel-header lp-reveal">
            <span className="lp-section-eyebrow">Our Tags</span>
            <h2 className="lp-section-title">Not just functional. Beautiful.</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto' }}>
              Each tag features your own artwork or photography — fully scannable,
              fully yours. Flip any tag to see both sides. We offer <strong>two customizable styles</strong> —
              <span className="shining-gold-text">Photo-Front</span> and <span className="shining-gold-text">Photo-Back</span>. Click either below to preview them live!
            </p>
          </div>

          <ProductCarousel landingQrs={landingQrs} fetchingLandingQrs={fetchingLandingQrs} />
        </div>
      </section>

      {/* ── Why Us ── */}
      <section id="why-us" className="lp-whyus-wrapper">
        <div className="lp-section">
          <div className="lp-whyus-header lp-reveal">
            <span className="lp-section-eyebrow">Why I'm Here</span>
            <h2 className="lp-section-title">We're not another QR generator.</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto' }}>
              Most QR codes are ugly and serve a single purpose. Ours are designed
              to be carried proudly and do something meaningful.
            </p>
          </div>

          <div className="lp-comparison-grid">
            <div className="lp-comparison-col them lp-reveal">
              <div className="lp-comparison-col-title">Generic QR Codes</div>
              <div className="lp-comparison-col-subtitle">Static and forgettable</div>
              <ul className="lp-comparison-list">
                {[
                  'Plain black and white squares',
                  'No identity or personalisation',
                  'Look out of place on your belongings',
                  'No built-in contact or recovery',
                  'No privacy controls',
                  'Just a link in a square',
                ].map((t, i) => (
                  <li key={i}><span className="li-icon">✕</span>{t}</li>
                ))}
              </ul>
            </div>

            <div className="lp-vs-badge">
              <div className="lp-vs-badge-inner">VS</div>
            </div>

            <div className="lp-comparison-col us lp-reveal lp-reveal-delay-2">
              <div className="lp-comparison-col-title">I'm Here Tags</div>
              <div className="lp-comparison-col-subtitle">Designed with intent</div>
              <ul className="lp-comparison-list">
                {[
                  'Custom artwork and photography',
                  'Secure owner profile on every scan',
                  'Designed to look good on anything',
                  'Complete recovery and contact system',
                  'You control what information is shared',
                  'Real product, not just a sticker',
                ].map((t, i) => (
                  <li key={i}><span className="li-icon">✓</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-cta-wrapper">
        <div className="lp-section">
          <div className="lp-cta-inner lp-reveal">
            <h2 className="lp-cta-title">Your belongings deserve<br />a safety net.</h2>
            <p className="lp-cta-desc">
              Get your personalised I'm Here QR tag.<br />
              Attach it. Register it. Stay protected.
            </p>
            <a href="/orders" className="lp-cta-btn">
              Order Now
            </a>
            <p className="lp-cta-trust-line">
              Secure checkout · Ships across India · Easy returns
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <img src="/full logo black.png" alt="I'm Here" />
              <p>Smart QR recovery tags that help reunite lost belongings with their owners. Personalised, privacy-first, and beautifully designed.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Product</div>
              <ul className="lp-footer-col-links">
                <li><a href="#products">Our Tags</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="/orders">Order Now</a></li>
                <li><a href="/id?=preview">Preview Scan</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Company</div>
              <ul className="lp-footer-col-links">
                <li><a href="#why-us">Why Us</a></li>
                <li><a href="/terms">Terms & Conditions</a></li>
                <li><a href="/privacy">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Support</div>
              <ul className="lp-footer-col-links">
                <li><a href="/shipping_policy">Shipping Policy</a></li>
                <li><a href="/refund_policy">Refund Policy</a></li>
                <li>
                  <a
                    href={isDesktop ? "https://mail.google.com/mail/u/0/?to=nikhil.pabbisetti2006@gmail.com&fs=1&tf=cm" : "mailto:nikhil.pabbisetti2006@gmail.com"}
                    target={isDesktop ? "_blank" : undefined}
                    rel={isDesktop ? "noopener noreferrer" : undefined}
                  >
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <hr className="lp-footer-divider" />

          <div className="lp-footer-bottom">
            <p className="lp-footer-copy">&copy; 2026 I'M HERE. All rights reserved.</p>
            <p className="lp-footer-copy" style={{ color: '#334155' }}>
              Made in India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
