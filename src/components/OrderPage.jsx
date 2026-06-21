import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Lock, Unlock, ShoppingCart, Plus, Minus, Trash2,
  Image as ImageIcon, Check, Sparkles, Tag, Eye, RotateCw, Truck
} from 'lucide-react';
import { ensureQrLib, makeQR, drawDot, drawFinder, drawBanner, roundRectPath } from '../utils/qrDrawer';
import { initializeFirebase } from '../firebase';
import {
  collection, addDoc, serverTimestamp, doc, getDoc
} from 'firebase/firestore';
import './OrderPage.css';

/* ── Constants ─────────────────────────────────────── */
const DUMMY_URL = 'https://im-here-qr.vercel.app/id?=preview';

const CLASSIC_PRESETS = [
  {
    id: 'midnight',
    name: 'Midnight',
    dotColor: '#ffffff',
    bgColor: '#0a0a0a',
    cardStyle: { background: '#0a0a0a' },
    label: 'White dots · Black background'
  },
  {
    id: 'daylight',
    name: 'Daylight',
    dotColor: '#111111',
    bgColor: '#ffffff',
    cardStyle: { background: '#f1f5f9' },
    label: 'Black dots · White background'
  }
];

const KeyringSvg = ({ width = 60, height = 115, marginBottom = '-38px', marginRight = '0px' }) => (
  <svg width={width} height={height} viewBox="0 0 60 115" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom, marginRight, zIndex: 5, position: 'relative' }}>
    {/* Matte Silver Ring (Keyring) */}
    <circle cx="30" cy="20" r="16" stroke="url(#metal-grad)" strokeWidth="4" fill="none" filter="drop-shadow(0px 3px 3px rgba(0,0,0,0.35))" />
    <circle cx="30" cy="20" r="14.25" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" fill="none" />

    {/* Longer Matte Silver Chain Links */}
    <rect x="27.5" y="34" width="5" height="12" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="43" width="5" height="12" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" transform="rotate(15, 30, 49)" />
    <rect x="27.5" y="52" width="5" height="12" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="61" width="5" height="12" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" transform="rotate(-15, 30, 67)" />
    <rect x="27.5" y="70" width="5" height="12" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.2" fill="none" filter="drop-shadow(0px 1px 1.5px rgba(0,0,0,0.2))" />
    <rect x="27.5" y="79" width="5" height="16" rx="2.5" stroke="url(#metal-grad)" strokeWidth="2.5" fill="none" filter="drop-shadow(0px 1.5px 2px rgba(0,0,0,0.35))" />

    <defs>
      <linearGradient id="metal-grad" x1="14" y1="6" x2="46" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#e5e7eb" />
        <stop offset="25%" stop-color="#9ca3af" />
        <stop offset="50%" stop-color="#d1d5db" />
        <stop offset="75%" stop-color="#6b7280" />
        <stop offset="100%" stop-color="#cbd5e1" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Helper: draw branded QR code (matching admin) ── */
function drawBrandedQr(uploadedImg, cropState, presetOptions) {
  if (typeof window.qrcode === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  let qrResult;
  try {
    qrResult = makeQR(DUMMY_URL);
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
  const bgMode = presetOptions.bgMode || 'solid';
  const overlayDarkness = presetOptions.overlayDarkness !== undefined ? presetOptions.overlayDarkness : 40;
  const dotShape = presetOptions.dotShape || 'circle';
  const cornerShape = presetOptions.cornerShape || 'circle';
  const dotSize = presetOptions.dotSize || 80;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (bgMode === 'image' && uploadedImg && cropState) {
    const s = cropState.scale || 1;
    const srcX = cropState.x * s;
    const srcY = cropState.y * s;
    const srcSize = cropState.size * s;

    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 320;
    logoCanvas.height = 320;
    const lCtx = logoCanvas.getContext('2d');
    try {
      lCtx.drawImage(uploadedImg, srcX, srcY, srcSize, srcSize, 0, 0, 320, 320);
      ctx.drawImage(logoCanvas, 0, 0, canvas.width, canvas.height);
      if (overlayDarkness > 0) {
        ctx.fillStyle = `rgba(0,0,0,${overlayDarkness / 100})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } catch (e) {
      console.warn("Failed to draw background image:", e);
    }
  }

  // Set shadow for dots to guarantee scan contrast on light background images
  if (bgMode === 'image') {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
  }

  // Draw dots
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      const isFinder = (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);
      if (isFinder) continue;
      if (qr.isDark(row, col)) {
        drawDot(ctx, row, col, margin, moduleSize, dotColor, dotShape, bannerH, dotSize / 100);
      }
    }
  }

  // Draw corners
  drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, cornerShape, bannerH);
  drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, cornerShape, bannerH);
  drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, cornerShape, bannerH);

  // Reset shadow properties before drawing logo and banner
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Draw banner frame (at the top)
  const frameText = presetOptions.frameText || "SCAN ME TO FIND ME";
  const frameBgColor = presetOptions.frameBgColor || '#000000';
  const frameTextColor = presetOptions.frameTextColor || '#ffffff';
  drawBanner(ctx, qrSize, bannerH, frameText, frameBgColor, frameTextColor, 0);

  return canvas;
}

/* ══════════════════════════════════════════════════════
   OrderPage Component
   ══════════════════════════════════════════════════════ */
const OrderPage = () => {
  /* ── Prices (from Firestore / default values) ── */
  const [prices, setPrices] = useState({
    personalisedOriginal: 299,
    personalisedDiscounted: 199,
    classicOriginal: 199,
    classicDiscounted: 129
  });

  /* ── Firebase DB (local instance for order saving) ── */
  const [firestoreDb, setFirestoreDb] = useState(null);

  /* ── Page step ── */
  const [step, setStep] = useState('home'); // 'home' | 'personalised' | 'classic' | 'checkout'

  /* ── Personalised flow ── */
  const [uploadedImg, setUploadedImg] = useState(null);
  const [uploadedBlob, setUploadedBlob] = useState(null); // Original file/blob for Storage upload
  const [cropState, setCropState] = useState({ x: 0, y: 0, size: 120, dispW: 0, dispH: 0, scale: 1 });
  const [cropLocked, setCropLocked] = useState(false);
  const [qty, setQty] = useState(1);

  /* ── Drag (move) crop box ── */
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0 });

  /* ── Resize crop box ── */
  const [resizing, setResizing] = useState(null);

  /* ── Classic flow ── */
  const [classicPreset, setClassicPreset] = useState(null);
  const [classicQty, setClassicQty] = useState(1);

  /* ── Cart ── */
  const [cartItems, setCartItems] = useState([]);
  const [forceShowSelection, setForceShowSelection] = useState(false);
  const [showAddMoreOptions, setShowAddMoreOptions] = useState(false);

  /* ── Zoom Preview Modal State ── */
  const [activePreviewUrl, setActivePreviewUrl] = useState(null);

  /* ── Quantity Alert Modal State ── */
  const [showQtyAlert, setShowQtyAlert] = useState(false);

  /* ── QR library loaded state ── */
  const [qrLibLoaded, setQrLibLoaded] = useState(false);

  /* ── Flip Preview State ── */
  const [isPreviewFlipped, setIsPreviewFlipped] = useState(false);
  const [isMidnightFlipped, setIsMidnightFlipped] = useState(false);
  const [isDaylightFlipped, setIsDaylightFlipped] = useState(false);
  const [logoImage, setLogoImage] = useState(null);
  const [isStruck, setIsStruck] = useState(false);

  /* ── Checkout form states ── */
  const [checkoutForm, setCheckoutForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [isCodLoading, setIsCodLoading] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/full logo.png';
    img.onload = () => setLogoImage(img);
  }, []);

  /* ─────────────────────────────────────────────────
     Initialize Firebase on mount for order saving
  ───────────────────────────────────────────────── */
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let config = null;
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
          const res = await fetch('/api/config');
          if (res.ok) {
            const data = await res.json();
            config = data.config;
          }
        }
        if (config && config.apiKey) {
          const db = initializeFirebase(config);
          setFirestoreDb(db);
        }
      } catch (e) {
        console.warn('Firebase init for orders failed:', e);
      }
    };
    initFirebase();
  }, []);

  /* ── Refs ── */
  const cropCanvasRef = useRef(null);
  const keychainCanvasRef = useRef(null);
  const midnightCanvasRef = useRef(null);
  const daylightCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const cartRef = useRef(null);
  const isSubmitting = useRef(false);



  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* ─────────────────────────────────────────────────
     Fetch prices from Firestore on mount
  ───────────────────────────────────────────────── */
  useEffect(() => {
    // 1. Try loading from localStorage first as fallback
    try {
      const saved = localStorage.getItem('imhere_prices');
      if (saved) {
        const data = JSON.parse(saved);
        setPrices(prev => ({
          ...prev,
          personalisedOriginal: data.personalisedOriginal !== undefined ? data.personalisedOriginal : prev.personalisedOriginal,
          personalisedDiscounted: data.personalisedDiscounted !== undefined ? data.personalisedDiscounted : prev.personalisedDiscounted,
          classicOriginal: data.classicOriginal !== undefined ? data.classicOriginal : prev.classicOriginal,
          classicDiscounted: data.classicDiscounted !== undefined ? data.classicDiscounted : prev.classicDiscounted
        }));
      }
    } catch {}

    // 2. Fetch from Firestore for remote sync
    if (!firestoreDb) return;
    const fetchPrices = async () => {
      try {
        const docRef = doc(firestoreDb, 'settings', 'prices');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrices({
            personalisedOriginal: data.personalisedOriginal !== undefined ? data.personalisedOriginal : 299,
            personalisedDiscounted: data.personalisedDiscounted !== undefined ? data.personalisedDiscounted : 199,
            classicOriginal: data.classicOriginal !== undefined ? data.classicOriginal : 199,
            classicDiscounted: data.classicDiscounted !== undefined ? data.classicDiscounted : 129
          });
          // Cache in localStorage
          try {
            localStorage.setItem('imhere_prices', JSON.stringify(data));
          } catch {}
        }
      } catch (err) {
        console.warn("Failed to fetch settings/prices from Firestore in client:", err);
      }
    };
    fetchPrices();
  }, [firestoreDb]);

  /* ─────────────────────────────────────────────────
     Trigger pricing strike-through animation
  ───────────────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => setIsStruck(true), 350);
    return () => clearTimeout(timer);
  }, []);

  /* ─────────────────────────────────────────────────
     Ensure QR Library is loaded on mount
  ───────────────────────────────────────────────── */
  useEffect(() => {
    ensureQrLib().then(ok => {
      if (ok) setQrLibLoaded(true);
    });
  }, []);

  /* ─────────────────────────────────────────────────
     Warn user before reloading if cart has items
  ───────────────────────────────────────────────── */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSubmitting.current) return;
      if (cartItems.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have items in your cart. If you reload, your cart will be cleared. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cartItems]);

  /* ─────────────────────────────────────────────────
     Draw crop editor background
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!cropCanvasRef.current || !uploadedImg) return;
    const canvas = cropCanvasRef.current;
    canvas.width = cropState.dispW;
    canvas.height = cropState.dispH;
    canvas.getContext('2d').drawImage(uploadedImg, 0, 0, cropState.dispW, cropState.dispH);
  }, [cropState.dispW, cropState.dispH, uploadedImg]);

  /* ─────────────────────────────────────────────────
     Draw keychain preview
  ───────────────────────────────────────────────── */
  const drawKeychain = useCallback(() => {
    const canvas = keychainCanvasRef.current;
    if (!canvas) return;

    const W = 640; const H = 700;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const isPersonalised = (step === 'personalised');
    const preset = !isPersonalised && step === 'classic' ? CLASSIC_PRESETS.find(p => p.id === classicPreset) : null;

    if (isPreviewFlipped) {
      // Back-side rendering (Logo brand in full cover)
      // 1. Draw appropriate background
      if (isPersonalised && uploadedImg && cropState.dispW > 0) {
        const s = cropState.scale || 1;
        const srcX = cropState.x * s;
        const srcY = cropState.y * s;
        const srcSize = cropState.size * s;
        try {
          ctx.drawImage(uploadedImg, srcX, srcY, srcSize, srcSize, 0, 0, W, H);
          ctx.fillStyle = "rgba(0,0,0,0.4)"; // overlay darkness
          ctx.fillRect(0, 0, W, H);
        } catch (e) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, W, H);
        }
      } else if (preset) {
        ctx.fillStyle = preset.bgColor;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Draw brand logo in full cover
      if (logoImage) {
        // Easily adjustable logo coordinates for the user
        const logoX = 0;
        const logoY = 0;
        const logoW = W;
        const logoH = H;
        ctx.drawImage(logoImage, logoX, logoY, logoW, logoH);
      }
    } else {
      // Front-side rendering (QR code tag design)
      if (isPersonalised && uploadedImg && cropState.dispW > 0) {
        const brandedCanvas = drawBrandedQr(uploadedImg, cropState, {
          dotColor: '#ffffff',
          bgColor: '#000000',
          bgMode: 'image',
          overlayDarkness: 40,
          dotShape: 'circle',
          cornerShape: 'circle',
          dotSize: 80,
          frameText: "SCAN ME TO FIND ME",
          frameBgColor: '#000000',
          frameTextColor: '#ffffff'
        });
        if (brandedCanvas) {
          ctx.drawImage(brandedCanvas, 0, 0);
        }
      } else if (preset) {
        const brandedCanvas = drawBrandedQr(null, null, {
          dotColor: preset.dotColor,
          bgColor: preset.bgColor,
          bgMode: 'solid',
          dotShape: 'circle',
          cornerShape: 'circle',
          dotSize: 80,
          frameText: "SCAN ME TO FIND ME",
          frameBgColor: preset.id === 'midnight' ? '#000000' : '#111111',
          frameTextColor: '#ffffff'
        });
        if (brandedCanvas) {
          ctx.drawImage(brandedCanvas, 0, 0);
        }
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
      }
    }
  }, [uploadedImg, cropState, classicPreset, step, isPreviewFlipped, logoImage, qrLibLoaded]);

  useEffect(() => { drawKeychain(); }, [drawKeychain]);

  /* ─────────────────────────────────────────────────
     Draw classic preset canvases
  ───────────────────────────────────────────────── */
  const drawClassicCanvas = useCallback((canvasRef, preset, isFlipped) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 640; const H = 700;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    if (isFlipped) {
      // Draw back-side (solid background + logo brand in full cover)
      ctx.fillStyle = preset.bgColor;
      ctx.fillRect(0, 0, W, H);

      if (logoImage) {
        const logoX = 0;
        const logoY = 0;
        const logoW = W;
        const logoH = H;
        ctx.drawImage(logoImage, logoX, logoY, logoW, logoH);
      }
    } else {
      // Draw front-side (QR code)
      const brandedCanvas = drawBrandedQr(null, null, {
        dotColor: preset.dotColor,
        bgColor: preset.bgColor,
        bgMode: 'solid',
        dotShape: 'circle',
        cornerShape: 'circle',
        dotSize: 80,
        frameText: "SCAN ME TO FIND ME",
        frameBgColor: preset.id === 'midnight' ? '#000000' : '#111111',
        frameTextColor: '#ffffff'
      });

      if (brandedCanvas) {
        ctx.drawImage(brandedCanvas, 0, 0);
      }
    }
  }, [logoImage, qrLibLoaded]);

  useEffect(() => {
    if (step === 'classic' && qrLibLoaded) {
      setTimeout(() => {
        drawClassicCanvas(midnightCanvasRef, CLASSIC_PRESETS[0], isMidnightFlipped);
        drawClassicCanvas(daylightCanvasRef, CLASSIC_PRESETS[1], isDaylightFlipped);
      }, 40);
    }
  }, [step, qrLibLoaded, isMidnightFlipped, isDaylightFlipped, drawClassicCanvas]);

  /* ─────────────────────────────────────────────────
     Image Upload
  ───────────────────────────────────────────────── */
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedBlob(file); // Store original file for Storage upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImg(img);
        const maxW = 280;
        const scaleDown = Math.min(1, maxW / img.width);
        const dispW = Math.round(img.width * scaleDown);
        const dispH = Math.round(img.height * scaleDown);
        const initSize = Math.round(Math.min(dispW, dispH) * 0.58);
        setCropState({
          x: Math.round((dispW - initSize) / 2),
          y: Math.round((dispH - initSize) / 2),
          size: initSize,
          dispW, dispH,
          scale: img.width / dispW
        });
        setCropLocked(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  /* ─────────────────────────────────────────────────
     Rotate Photo 90 Degrees Clockwise
  ───────────────────────────────────────────────── */
  const handleRotateImage = () => {
    if (!uploadedImg) return;

    const canvas = document.createElement('canvas');
    canvas.width = uploadedImg.height;
    canvas.height = uploadedImg.width;

    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(uploadedImg, -uploadedImg.width / 2, -uploadedImg.height / 2);

    // Store rotated image as blob for Storage upload
    canvas.toBlob((blob) => {
      if (blob) setUploadedBlob(blob);
    }, 'image/jpeg', 0.97);

    const rotatedImg = new Image();
    rotatedImg.onload = () => {
      setUploadedImg(rotatedImg);
      const maxW = 280;
      const scaleDown = Math.min(1, maxW / rotatedImg.width);
      const dispW = Math.round(rotatedImg.width * scaleDown);
      const dispH = Math.round(rotatedImg.height * scaleDown);
      const initSize = Math.round(Math.min(dispW, dispH) * 0.58);
      setCropState({
        x: Math.round((dispW - initSize) / 2),
        y: Math.round((dispH - initSize) / 2),
        size: initSize,
        dispW, dispH,
        scale: rotatedImg.width / dispW
      });
      setCropLocked(false);
    };
    rotatedImg.src = canvas.toDataURL();
  };

  /* ─────────────────────────────────────────────────
     Crop Box Drag (move)
  ───────────────────────────────────────────────── */
  const handleCropBoxDown = (e) => {
    if (cropLocked || resizing) return;
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, boxX: cropState.x, boxY: cropState.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setCropState(prev => ({
        ...prev,
        x: clamp(dragStart.boxX + dx, 0, prev.dispW - prev.size),
        y: clamp(dragStart.boxY + dy, 0, prev.dispH - prev.size)
      }));
    }

    if (resizing) {
      const { handle, startX, startY, startSize, startCropX, startCropY } = resizing;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let delta = 0;
      if (handle === 'se') delta = (dx + dy) / 2;
      else if (handle === 'nw') delta = (-dx - dy) / 2;
      else if (handle === 'ne') delta = (dx - dy) / 2;
      else if (handle === 'sw') delta = (-dx + dy) / 2;

      setCropState(prev => {
        const newSize = clamp(startSize + delta, 40, Math.min(prev.dispW, prev.dispH));
        const actual = newSize - startSize;
        let newX = startCropX;
        let newY = startCropY;
        if (handle === 'nw') { newX = startCropX - actual; newY = startCropY - actual; }
        else if (handle === 'ne') { newY = startCropY - actual; }
        else if (handle === 'sw') { newX = startCropX - actual; }
        return {
          ...prev,
          size: newSize,
          x: clamp(newX, 0, prev.dispW - newSize),
          y: clamp(newY, 0, prev.dispH - newSize)
        };
      });
    }
  };

  const handlePointerUp = () => { setDragging(false); setResizing(null); };

  const handleResizeDown = (e, handle) => {
    if (cropLocked) return;
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      handle,
      startX: e.clientX, startY: e.clientY,
      startSize: cropState.size,
      startCropX: cropState.x, startCropY: cropState.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  /* ─────────────────────────────────────────────────
     Add to Cart
  ───────────────────────────────────────────────── */
  /* ── Helper: create small thumbnail (max 200px) for Firestore preview ── */
  const createThumbnail = (canvas) => {
    const maxSize = 200;
    const aspect = canvas.width / canvas.height;
    const w = aspect >= 1 ? maxSize : Math.round(maxSize * aspect);
    const h = aspect >= 1 ? Math.round(maxSize / aspect) : maxSize;
    const thumb = document.createElement('canvas');
    thumb.width = w; thumb.height = h;
    thumb.getContext('2d').drawImage(canvas, 0, 0, w, h);
    return thumb.toDataURL('image/jpeg', 0.72);
  };

  const handleAddToCart = () => {
    if (step === 'personalised') {
      if (!uploadedImg) return;
      drawKeychain();
      const keychainCanvas = keychainCanvasRef.current;
      const previewUrl = keychainCanvas?.toDataURL() || '';
      const thumbnailUrl = keychainCanvas ? createThumbnail(keychainCanvas) : previewUrl;

      // Compute source crop coordinates (original image pixels)
      const s = cropState.scale || 1;
      const srcCropX = Math.round(cropState.x * s);
      const srcCropY = Math.round(cropState.y * s);
      const srcCropSize = Math.round(cropState.size * s);

      setCartItems(prev => [...prev, {
        id: Date.now(),
        type: 'personalised',
        typeofqr: 'personalised',
        previewUrl,
        thumbnailUrl,
        label: 'Personalised Tag',
        qty,
        unitPrice: prices.personalisedDiscounted,
        originalPrice: prices.personalisedOriginal,
        // Store blob and crop info for order saving
        _uploadedBlob: uploadedBlob,
        _srcCropX: srcCropX,
        _srcCropY: srcCropY,
        _srcCropSize: srcCropSize,
      }]);
      setUploadedImg(null);
      setUploadedBlob(null);
      setCropState({ x: 0, y: 0, size: 120, dispW: 0, dispH: 0, scale: 1 });
      setCropLocked(false);
      setQty(1);

    } else if (step === 'classic') {
      if (!classicPreset) return;
      const preset = CLASSIC_PRESETS.find(p => p.id === classicPreset);
      const canvasRef = classicPreset === 'midnight' ? midnightCanvasRef : daylightCanvasRef;
      const canvasEl = canvasRef.current;
      const previewUrl = canvasEl?.toDataURL() || '';
      const thumbnailUrl = canvasEl ? createThumbnail(canvasEl) : previewUrl;
      const typeofqr = classicPreset === 'midnight' ? 'classic_black' : 'classic_white';
      setCartItems(prev => [...prev, {
        id: Date.now(),
        type: 'classic',
        typeofqr,
        previewUrl,
        thumbnailUrl,
        label: `Classic ${preset.name} Tag`,
        qty: classicQty,
        unitPrice: prices.classicDiscounted,
        originalPrice: prices.classicOriginal
      }]);
      setClassicPreset(null);
      setClassicQty(1);
    }

    setStep('home');
    setForceShowSelection(false);
    setTimeout(() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  /* ─────────────────────────────────────────────────
     Upload personalised image blob to Cloudinary
     Keys set via VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET
  ───────────────────────────────────────────────── */
  const uploadImageToCloudinary = async (blob, orderTempId, itemIdx) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary config missing (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET) — skipping image upload');
      return { url: '', publicId: '' };
    }

    try {
      const formData = new FormData();
      formData.append('file', blob, `item_${itemIdx}.jpg`);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'items');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Cloudinary HTTP ${res.status}`);
      }

      const data = await res.json();
      return { url: data.secure_url, publicId: data.public_id };
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return { url: '', publicId: '' };
    }
  };

  /* ─────────────────────────────────────────────────
     Save order to Firestore 'orders' collection
     Returns the Firestore document ID
  ───────────────────────────────────────────────── */
  const handleSaveOrder = async (paymentMode, initialStatus = 'paymentPending') => {
    if (!firestoreDb) throw new Error('Database not available.');

    // Build items array (upload images first)
    const tempOrderId = `temp_${Date.now()}`;
    const orderItems = [];

    for (let idx = 0; idx < cartItems.length; idx++) {
      const item = cartItems[idx];
      let imageDownloadUrl = '';
      let cloudinaryPublicId = '';

      if (item.typeofqr === 'personalised' && item._uploadedBlob) {
        const uploadResult = await uploadImageToCloudinary(item._uploadedBlob, tempOrderId, idx);
        imageDownloadUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
      }

      orderItems.push({
        typeofqr: item.typeofqr,
        quantity: item.qty,
        unitPrice: item.unitPrice,
        thumbnailUrl: item.thumbnailUrl || '',
        ...(item.typeofqr === 'personalised' ? {
          imageUrl: imageDownloadUrl,       // Cloudinary secure_url
          cloudinaryPublicId,
          srcCropX: item._srcCropX || 0,
          srcCropY: item._srcCropY || 0,
          srcCropSize: item._srcCropSize || 0,
        } : {})
      });
    }

    const orderDoc = {
      orderedPhoneNumber: checkoutForm.phone,
      orderedEmail: checkoutForm.email,
      customerName: `${checkoutForm.firstName} ${checkoutForm.lastName}`.trim(),
      shippingAddress: {
        address: checkoutForm.address,
        city: checkoutForm.city,
        state: checkoutForm.state,
        pincode: checkoutForm.pincode
      },
      items: orderItems,
      totalAmount: total,
      paymentMode,
      orderStatus: initialStatus,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(firestoreDb, 'orders'), orderDoc);
    return docRef.id;
  };

  const handlePayNow = async (e) => {
    e.preventDefault();
    if (!checkoutForm.firstName || !checkoutForm.email || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.city || !checkoutForm.state || !checkoutForm.pincode) {
      setCheckoutError('Please fill in all required fields.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');
    isSubmitting.current = true;

    try {
      // 1. Save order to Firestore first (status: paymentPending)
      let firestoreOrderId = '';
      if (firestoreDb) {
        try {
          firestoreOrderId = await handleSaveOrder('online', 'paymentPending');
        } catch (err) {
          console.warn('Order pre-save failed:', err);
        }
      }

      // 2. Initiate Zaakpay payment (pass firestoreOrderId as metadata)
      const response = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          buyerEmail: checkoutForm.email,
          buyerPhoneNumber: checkoutForm.phone,
          buyerFirstName: checkoutForm.firstName,
          buyerLastName: checkoutForm.lastName,
          buyerAddress: checkoutForm.address,
          buyerCity: checkoutForm.city,
          buyerState: checkoutForm.state,
          buyerPincode: checkoutForm.pincode,
          firestoreOrderId
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate payment transaction.');
      }

      // 3. Submit form to Zaakpay gateway
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.gatewayUrl;

      Object.keys(data.params).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data.params[key];
        form.appendChild(input);
      });

      // Pass firestoreOrderId as a hidden field so payment-response can include it in the redirect
      if (firestoreOrderId) {
        const fsInput = document.createElement('input');
        fsInput.type = 'hidden';
        fsInput.name = 'firestoreOrderId';
        fsInput.value = firestoreOrderId;
        form.appendChild(fsInput);
      }

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      isSubmitting.current = false;
      console.error("Payment submission error:", err);
      setCheckoutError(err.message || 'Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────
     Cash on Delivery handler
  ───────────────────────────────────────────────── */
  const handleCOD = async () => {
    if (!checkoutForm.firstName || !checkoutForm.email || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.city || !checkoutForm.state || !checkoutForm.pincode) {
      setCheckoutError('Please fill in all required fields.');
      return;
    }

    setIsCodLoading(true);
    setCheckoutError('');
    isSubmitting.current = true;

    try {
      let orderId = `COD-${Date.now()}`;
      if (firestoreDb) {
        orderId = await handleSaveOrder('cod', 'orderplaced');
      }
      // Redirect to success page with COD mode
      window.location.href = `/payment-status?status=success&orderId=${encodeURIComponent(orderId)}&mode=cod&amount=${encodeURIComponent(total)}`;
    } catch (err) {
      isSubmitting.current = false;
      console.error('COD order save error:', err);
      setCheckoutError(err.message || 'Failed to place order. Please try again.');
      setIsCodLoading(false);
    }
  };

  const removeCartItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id));
  const updateCartQty = (id, delta) => {
    if (delta === 1) {
      const item = cartItems.find(i => i.id === id);
      if (item && item.qty === 1) {
        setShowQtyAlert(true);
      }
    }
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const total = cartItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const totalSavings = cartItems.reduce((s, i) => s + i.qty * ((i.originalPrice || i.unitPrice) - i.unitPrice), 0);

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */
  return (
    <div className="order-page">

      {/* ── Hero ── */}
      <div className="order-hero">
        <div className="order-hero-badge">🔖 Smart QR Keychains</div>
        <h1>Order Your <span>I'm Here</span> Tag</h1>
        <p>
          Attach to your bags, bike keys, car keys, or wallet — one scan
          brings your belongings back to you.
        </p>
      </div>

      <div className="order-main">


        {/* ════════════════════════════════════════════
            STEP: HOME — Choose tag type
        ════════════════════════════════════════════ */}
        {step === 'home' && (
          <>
            {(cartItems.length === 0 || forceShowSelection) && (
              <div className="order-section">
                <h2 className="order-section-title">
                  <Tag size={22} /> Choose Your Tag Style
                </h2>
                <p className="order-section-subtitle">
                  Both styles come with your unique I'm Here QR code — just different looks.
                </p>

                <div className="tag-type-grid">
                  {/* Personalised */}
                  <div
                    className="tag-type-card personalised"
                    onClick={() => setStep('personalised')}
                    role="button"
                    id="btn-choose-personalised"
                  >
                    <div className="tag-type-icon">🎨</div>
                    <h3>Personalised</h3>
                    <p>
                      Your photo as the background — your pet, a favourite memory, or
                      anything you love. Makes your tag truly yours.
                    </p>
                    <div className="tag-type-price">
                      <span className={`price-original ${isStruck ? 'struck' : ''}`}>₹{prices.personalisedOriginal}</span>
                      <span className={`price-discounted ${isStruck ? 'visible' : ''}`}>₹{prices.personalisedDiscounted}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}> per tag</span>
                    </div>
                    <div className="tag-type-cta">Customise Mine →</div>
                  </div>

                  {/* Classic */}
                  <div
                    className="tag-type-card classic"
                    onClick={() => setStep('classic')}
                    role="button"
                    id="btn-choose-classic"
                  >
                    <div className="tag-type-icon">⬛</div>
                    <h3>Classic</h3>
                    <p>
                      Clean, minimal, instantly recognisable. Two iconic colour
                      combinations that always look sharp.
                    </p>
                    <div className="tag-type-price">
                      <span className={`price-original ${isStruck ? 'struck' : ''}`}>₹{prices.classicOriginal}</span>
                      <span className={`price-discounted ${isStruck ? 'visible' : ''}`}>₹{prices.classicDiscounted}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}> per tag</span>
                    </div>
                    <div className="tag-type-cta">Pick a Style →</div>
                  </div>
                </div>
              </div>
            )}

            {/* Cart */}
            {cartItems.length > 0 && (
              <div className="order-section cart-section" ref={cartRef}>
                <h2 className="order-section-title">
                  <ShoppingCart size={20} /> Your Order
                </h2>

                <div className="cart-items-list">
                  {cartItems.map(item => (
                    <div key={item.id} className="cart-item-row">
                      <img src={item.previewUrl} alt={item.label} className="cart-item-thumb" />
                      <div className="cart-item-info">
                        <div className="cart-item-label">{item.label}</div>
                        <div className="cart-item-unit">₹{item.unitPrice} each</div>
                      </div>
                      <button
                        className="cart-item-preview-btn"
                        onClick={() => setActivePreviewUrl(item.previewUrl)}
                        title="View Tag Design"
                      >
                        <Eye size={18} />
                      </button>
                      <div className="cart-item-qty-ctrl">
                        <button className="qty-btn-sm" onClick={() => updateCartQty(item.id, -1)}>−</button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                        <button className="qty-btn-sm" onClick={() => updateCartQty(item.id, 1)}>+</button>
                      </div>
                      <div className="cart-item-total">₹{item.qty * item.unitPrice}</div>
                      <button className="cart-item-remove" onClick={() => removeCartItem(item.id)} title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {totalSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>
                    <span>✨ Total Savings</span>
                    <span>−₹{totalSavings}</span>
                  </div>
                )}

                <div className="cart-total-row" style={{ marginTop: '4px' }}>
                  <span>Order Total</span>
                  <span className="total-amount">₹{total}</span>
                </div>

                <div className="cart-actions">
                  {showAddMoreOptions ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn-add-more"
                        onClick={() => {
                          setStep('personalised');
                          setShowAddMoreOptions(false);
                        }}
                        style={{ border: '1px solid rgba(139, 92, 246, 0.4)', color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}
                      >
                        🎨 Add Personalised Tag
                      </button>
                      <button
                        className="btn-add-more"
                        onClick={() => {
                          setStep('classic');
                          setShowAddMoreOptions(false);
                        }}
                        style={{ border: '1px solid rgba(6, 182, 212, 0.4)', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.05)' }}
                      >
                        ⬛ Add Classic Tag
                      </button>
                      <button
                        onClick={() => setShowAddMoreOptions(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '8px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-add-more"
                      id="btn-add-another-tag"
                      onClick={() => setShowAddMoreOptions(true)}
                    >
                      <Plus size={16} /> Add Another Tag
                    </button>
                  )}
                  <button
                    className="btn-checkout"
                    id="btn-checkout"
                    onClick={() => setStep('checkout')}
                  >
                    Proceed to Payment →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════
            STEP: PERSONALISED
        ════════════════════════════════════════════ */}
        {step === 'personalised' && (
          <div className="setup-panel">
            <button className="back-btn" onClick={() => { setStep('home'); setUploadedImg(null); }}>
              ← Back
            </button>

            <h2 className="order-section-title">
              <Sparkles size={22} /> Personalise Your Tag
            </h2>
            <p className="order-section-subtitle">
              Upload a photo — your pet, a memory, artwork — and preview it on your keychain tag.
              Drag the crop square to choose which part of the image appears.
            </p>

            {!uploadedImg ? (
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()} id="upload-zone">
                <Upload size={42} className="upload-icon" />
                <p>Tap to upload your photo</p>
                <span>JPG, PNG, HEIC, WEBP supported</span>
              </div>
            ) : (
              <>
                <div className="crop-preview-grid">

                  {/* ── Left: Crop Editor ── */}
                  <div>
                    <div className="section-label">
                      {cropLocked
                        ? <><Lock size={12} /> Position locked — scroll won't move it</>
                        : <>Drag box to reposition · Pull corners to resize</>}
                    </div>

                    <div
                      className="crop-editor-wrap"
                      style={{ width: cropState.dispW, height: cropState.dispH }}
                    >
                      <canvas ref={cropCanvasRef} style={{ display: 'block', borderRadius: 8 }} />

                      {/* Visual crop box with rule-of-thirds grid, corners and midpoint markers */}
                      <div
                        className={`crop-box ${cropLocked ? 'locked' : ''}`}
                        style={{
                          left: cropState.x,
                          top: cropState.y,
                          width: cropState.size,
                          height: cropState.size,
                          borderColor: cropLocked ? '#6366f1' : 'rgba(255, 255, 255, 0.45)',
                          cursor: cropLocked ? 'default' : dragging ? 'grabbing' : 'grab',
                          touchAction: 'none',
                          boxShadow: cropLocked
                            ? '0 0 0 2px rgba(99,102,241,0.2)'
                            : '0 0 0 2px rgba(255,255,255,0.1)'
                        }}
                        onPointerDown={handleCropBoxDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                      >
                        {/* Custom visual overlay */}
                        <div className="crop-box-overlay">
                          {/* Grid Lines (Rule of Thirds) */}
                          <div className="crop-grid-line-v v1" />
                          <div className="crop-grid-line-v v2" />
                          <div className="crop-grid-line-h h1" />
                          <div className="crop-grid-line-h h2" />

                          {/* Midpoint Bars */}
                          <div className="crop-edge-bar bar-top" />
                          <div className="crop-edge-bar bar-bottom" />
                          <div className="crop-edge-bar bar-left" />
                          <div className="crop-edge-bar bar-right" />

                          {/* Corners (L-brackets) */}
                          <div className="crop-corner-bracket corner-tl" />
                          <div className="crop-corner-bracket corner-tr" />
                          <div className="crop-corner-bracket corner-bl" />
                          <div className="crop-corner-bracket corner-br" />
                        </div>

                        {/* 4 corner resize handles */}
                        {!cropLocked && ['nw', 'ne', 'sw', 'se'].map(handle => (
                          <div
                            key={handle}
                            className={`crop-handle crop-handle-${handle}`}
                            onPointerDown={(e) => handleResizeDown(e, handle)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Controls below crop editor */}
                    <div className="crop-controls">
                      <button
                        className={`lock-btn ${cropLocked ? 'locked' : ''}`}
                        onClick={() => setCropLocked(l => !l)}
                        id="btn-lock-crop"
                      >
                        {cropLocked ? <><Lock size={14} /> Locked</> : <><Unlock size={14} /> Lock Position</>}
                      </button>

                      <button
                        className="change-photo-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon size={13} /> Change Photo
                      </button>

                      <button
                        className="change-photo-btn"
                        onClick={handleRotateImage}
                      >
                        <RotateCw size={13} /> Rotate Photo
                      </button>

                      <button
                        className="change-photo-btn"
                        style={{ borderColor: 'var(--accent-rose, #ef4444)', color: 'var(--accent-rose, #ef4444)' }}
                        onClick={() => {
                          setUploadedImg(null);
                          setCropState({ x: 0, y: 0, size: 120, dispW: 0, dispH: 0, scale: 1 });
                          setCropLocked(false);
                        }}
                      >
                        <Trash2 size={13} /> Remove Photo
                      </button>
                    </div>
                  </div>

                  {/* ── Right: Keychain Preview ── */}
                  <div className="keychain-preview-section">
                    <div className="section-label">Live Preview</div>
                    <div className="keychain-frame">
                      <div className={`keychain-idle-swing ${isPreviewFlipped ? 'flipped' : ''}`}>
                        <div
                          className={`hanging-keychain-wrapper ${isPreviewFlipped ? 'flipped' : ''}`}
                          style={{
                            alignItems: isPreviewFlipped ? 'flex-start' : 'flex-end'
                          }}
                        >
                          <KeyringSvg />
                          <div style={{ position: 'relative' }}>
                            <canvas ref={keychainCanvasRef} className="keychain-canvas" />
                            <div className="tag-hole-eyelet" style={{
                              position: 'absolute',
                              top: '12px',
                              right: isPreviewFlipped ? 'auto' : '22px',
                              left: isPreviewFlipped ? '22px' : 'auto',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: '3.5px solid #cbd5e1',
                              background: '#0a0a0a',
                              boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)',
                              zIndex: 6
                            }} />
                          </div>
                        </div>
                      </div>
                      <div className="keychain-label">Your I'm Here Tag</div>
                      <button
                        className="btn-flip-preview"
                        onClick={() => setIsPreviewFlipped(prev => !prev)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          background: 'rgba(15, 23, 42, 0.05)',
                          border: '1px solid rgba(15, 23, 42, 0.15)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <RotateCw size={14} /> Flip Tag
                      </button>
                    </div>
                  </div>
                </div>

                {/* Qty + Add to Cart */}
                <div className="qty-and-add">
                  <div className="qty-control">
                    <label>How many tags with this photo?</label>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>
                        <Minus size={16} />
                      </button>
                      <span className="qty-value">{qty}</span>
                      <button
                        className="qty-btn"
                        onClick={() => {
                          if (qty === 1) {
                            setShowQtyAlert(true);
                          }
                          setQty(q => q + 1);
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="qty-hint">₹{prices.personalisedDiscounted} × {qty} = ₹{prices.personalisedDiscounted * qty}</p>
                  </div>

                  <button
                    className="btn-add-to-cart"
                    onClick={handleAddToCart}
                    id="btn-add-personalised-to-cart"
                  >
                    <ShoppingCart size={18} /> Add to Order
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP: CLASSIC
        ════════════════════════════════════════════ */}
        {step === 'classic' && (
          <div className="setup-panel">
            <button className="back-btn" onClick={() => setStep('home')}>← Back</button>

            <h2 className="order-section-title">⬛ Classic Tag</h2>
            <p className="order-section-subtitle">
              Two iconic colour combinations. Both look great on any keychain, bag, or wallet.
            </p>

            <div className="classic-preset-grid">
              {CLASSIC_PRESETS.map((preset, idx) => {
                const isFlipped = preset.id === 'midnight' ? isMidnightFlipped : isDaylightFlipped;
                return (
                  <div
                    key={preset.id}
                    className={`classic-preset-card ${classicPreset === preset.id ? 'selected' : ''}`}
                    style={{
                      ...preset.cardStyle,
                      borderColor: classicPreset === preset.id ? '#6366f1' : 'transparent'
                    }}
                    onClick={() => setClassicPreset(preset.id)}
                    id={`btn-preset-${preset.id}`}
                  >
                    <div className={`keychain-idle-swing classic-swing ${isFlipped ? 'flipped' : ''}`}>
                      <div
                        className={`hanging-keychain-wrapper ${isFlipped ? 'flipped' : ''}`}
                        style={{
                          alignItems: isFlipped ? 'flex-start' : 'flex-end'
                        }}
                      >
                        <KeyringSvg width={70} height={133} marginBottom="-43px" marginRight="0px" />
                        <div style={{ position: 'relative' }}>
                          <canvas
                            ref={idx === 0 ? midnightCanvasRef : daylightCanvasRef}
                            className={`classic-canvas ${preset.id === 'midnight' ? 'midnight-canvas' : ''}`}
                          />
                          <div className="tag-hole-eyelet" style={{
                            position: 'absolute',
                            top: '15px',
                            right: isFlipped ? 'auto' : '25px',
                            left: isFlipped ? '25px' : 'auto',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '4px solid #cbd5e1',
                            background: preset.id === 'midnight' ? '#0a0a0a' : '#ffffff',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8), 0 0.5px 1px rgba(255,255,255,0.1)',
                            zIndex: 6
                          }} />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-flip-preview"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (preset.id === 'midnight') {
                          setIsMidnightFlipped(prev => !prev);
                        } else {
                          setIsDaylightFlipped(prev => !prev);
                        }
                      }}
                      style={{
                        marginTop: '4px',
                        marginBottom: '10px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: preset.id === 'midnight' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        border: preset.id === 'midnight' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
                        color: preset.id === 'midnight' ? '#ffffff' : '#111111',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        zIndex: 10
                      }}
                    >
                      <RotateCw size={12} /> Flip Tag
                    </button>

                    <div className="classic-preset-name" style={{ color: preset.dotColor }}>
                      {preset.name}
                    </div>
                    <div className="classic-preset-label" style={{ color: preset.dotColor, opacity: 0.6 }}>
                      {preset.label}
                    </div>
                    {classicPreset === preset.id && (
                      <div className="classic-check"><Check size={14} /></div>
                    )}
                  </div>
                );
              })}
            </div>

            {classicPreset && (
              <div className="qty-and-add">
                <div className="qty-control">
                  <label>How many tags?</label>
                  <div className="qty-stepper">
                    <button className="qty-btn" onClick={() => setClassicQty(q => Math.max(1, q - 1))}>
                      <Minus size={16} />
                    </button>
                    <span className="qty-value">{classicQty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => {
                        if (classicQty === 1) {
                          setShowQtyAlert(true);
                        }
                        setClassicQty(q => q + 1);
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="qty-hint">₹{prices.classicDiscounted} × {classicQty} = ₹{prices.classicDiscounted * classicQty}</p>
                </div>

                <button
                  className="btn-add-to-cart"
                  onClick={handleAddToCart}
                  id="btn-add-classic-to-cart"
                >
                  <ShoppingCart size={18} /> Add to Order
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP: CHECKOUT
        ════════════════════════════════════════════ */}
        {step === 'checkout' && (
          <div className="setup-panel animate-fade-in">
            <button className="back-btn" onClick={() => setStep('home')}>← Back to Cart</button>

            <h2 className="order-section-title">📦 Checkout Details</h2>
            <p className="order-section-subtitle">
              Enter your shipping information below to place your order. Payments are processed securely via Zaakpay.
            </p>

            {checkoutError && (
              <div className="checkout-error-banner" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                ⚠️ {checkoutError}
              </div>
            )}

            <form onSubmit={handlePayNow} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              
              {/* Shipping Address Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Shipping Information
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={checkoutForm.firstName}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      className="text-input"
                      value={checkoutForm.lastName}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      className="text-input"
                      required
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      type="tel"
                      className="text-input"
                      required
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={checkoutForm.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) {
                          setCheckoutForm(prev => ({ ...prev, phone: val }));
                        }
                      }}
                      placeholder=""
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    className="text-input"
                    required
                    value={checkoutForm.address}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder=""
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={checkoutForm.city}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={checkoutForm.state}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode *</label>
                    <input
                      type="text"
                      className="text-input"
                      required
                      value={checkoutForm.pincode}
                      onChange={(e) => setCheckoutForm(prev => ({ ...prev, pincode: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary & Pay CTA */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.02)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginTop: '12px'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '8px' }}>
                  Order Summary
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {cartItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <span>{item.label} (x{item.qty})</span>
                      <span>₹{item.qty * item.unitPrice}</span>
                    </div>
                  ))}
                  {totalSavings > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#10b981', fontWeight: 600, marginTop: '4px' }}>
                      <span>✨ Total Savings</span>
                      <span>−₹{totalSavings}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '6px' }}>
                    <span>Total Amount</span>
                    <span style={{ color: 'var(--accent-indigo)' }}>₹{total}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={checkoutLoading || isCodLoading}
                  className="btn-checkout"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1.05rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: '8px',
                    position: 'relative'
                  }}
                >
                  {checkoutLoading ? (
                    <>
                      <div className="payment-spinner" /> Saving & Redirecting to Zaakpay...
                    </>
                  ) : (
                    <>
                      💳 Pay ₹{total} via Zaakpay
                    </>
                  )}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-light)' }} />
                </div>

                {/* COD Button */}
                <button
                  type="button"
                  onClick={handleCOD}
                  disabled={checkoutLoading || isCodLoading}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    borderRadius: '12px',
                    cursor: (checkoutLoading || isCodLoading) ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.2s',
                    opacity: (checkoutLoading || isCodLoading) ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!checkoutLoading && !isCodLoading) {
                      e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                  }}
                >
                  {isCodLoading ? (
                    <><div className="payment-spinner" style={{ borderTopColor: '#10b981' }} /> Placing Order...</>
                  ) : (
                    <><Truck size={20} /> Cash on Delivery (COD)</>
                  )}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                  COD available · Pay when your order arrives 🚚
                </p>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* ── Zoom Preview Modal ── */}
      {activePreviewUrl && (
        <div
          className="preview-zoom-modal"
          onClick={() => setActivePreviewUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            style={{
              position: 'relative',
              background: '#ffffff',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid var(--border-light)',
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="keychain-idle-swing zoom-swing">
              <div className="hanging-keychain-wrapper">
                <KeyringSvg width={69} height={132} marginBottom="-44px" marginRight="0px" />
                <div style={{ position: 'relative' }}>
                  <img
                    src={activePreviewUrl}
                    alt="Design Preview"
                    style={{
                      width: '300px',
                      height: 'auto',
                      borderRadius: '18px',
                      border: '1px solid rgba(15, 23, 42, 0.1)',
                      boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
                      display: 'block'
                    }}
                  />
                  <div className="tag-hole-eyelet" style={{
                    position: 'absolute',
                    top: '14px',
                    right: '25px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '4px solid #cbd5e1',
                    background: '#0a0a0a',
                    boxShadow: 'inset 0 1.5px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.1)',
                    zIndex: 6
                  }} />
                </div>
              </div>
            </div>
            <button
              onClick={() => setActivePreviewUrl(null)}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: 'rgba(15, 23, 42, 0.05)',
                border: '1px solid rgba(15, 23, 42, 0.15)',
                color: 'var(--text-primary)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* ── Quantity Info Alert Modal ── */}
      {showQtyAlert && (
        <div
          className="qty-alert-modal"
          onClick={() => setShowQtyAlert(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <div
            style={{
              position: 'relative',
              background: '#ffffff',
              border: '1px solid var(--border-light)',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1.5px solid rgba(99, 102, 241, 0.2)',
              color: 'var(--accent-indigo)',
              fontSize: '1.8rem',
              margin: '0 auto 4px'
            }}>
              ℹ️
            </div>

            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Ordering Multiple Tags?
            </h3>

            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.55', textAlign: 'left' }}>
              All tags added here will use the <strong>same QR code</strong> (linked to the same owner details) {step === 'personalised' ? 'and the same background photo' : 'and the same design'}.
            </p>

            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-indigo)', fontWeight: 600, lineHeight: '1.55', textAlign: 'left' }}>
              {step === 'personalised'
                ? 'If you want different photos or separate QR codes for different keys or bags, please add this one to the cart first, then click "Add Another Tag" to customize a new one!'
                : 'If you want separate QR codes for different keys or bags, please add this one to the cart first, then click "Add Another Tag" to customize a new one!'
              }
            </p>

            <button
              onClick={() => setShowQtyAlert(false)}
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
              }}
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
