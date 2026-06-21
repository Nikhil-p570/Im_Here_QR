/* eslint-disable no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import './AdminPanel.css';
import { jsPDF } from 'jspdf';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  orderBy
} from 'firebase/firestore';

import {
  Globe,
  Sparkles,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Image as ImageIcon,
  Download,
  Plus,
  ShoppingBag,
  Phone,
  Mail,
  Package,
  RefreshCw,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ensureQrLib,
  drawDot,
  drawFinder,
  drawLogo,
  drawBanner,
  makeQR
} from '../utils/qrDrawer';

const PRESETS = [
  { name: 'Black on White', dot: '#000000', bg: '#ffffff' },
  { name: 'White on Black', dot: '#ffffff', bg: '#000000' },
  { name: 'Red on White', dot: '#e8402c', bg: '#ffffff' },
  { name: 'Navy on Cream', dot: '#1b2a4a', bg: '#f4f1ea' },
];

const AdminPanel = ({
  firestoreDb,
  onLogout
}) => {
  const predefinedDomain = "https://im-here-qr.vercel.app";

  // ID Generator App States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Admin/Clear database states
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminError, setAdminError] = useState("");

  // QR Generator Configurations States
  const [qrUrl, setQrUrl] = useState("");
  const [uploadedImg, setUploadedImg] = useState(null);
  const [dotColor, setDotColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");
  const [bgMode, setBgMode] = useState("image"); // solid, image
  const [hasBeenGeneratedOnce, setHasBeenGeneratedOnce] = useState(false);
  const [overlayDarkness, setOverlayDarkness] = useState(40);
  const [showLogoChip, setShowLogoChip] = useState(false);
  const [dotSize, setDotSize] = useState(80);
  const [dotShape, setDotShape] = useState("circle"); // square, rounded, circle
  const [cornerShape, setCornerShape] = useState("circle"); // square, rounded, circle
  const [hasFrame, setHasFrame] = useState(true);
  const [frameText, setFrameText] = useState("SCAN ME TO FIND ME");
  const [frameBgColor, setFrameBgColor] = useState("#000000");
  const [frameTextColor, setFrameTextColor] = useState("#ffffff");
  const [logoScale, setLogoScale] = useState(22);

  // QR Cropper State
  const [cropState, setCropState] = useState({
    x: 0,
    y: 0,
    size: 120,
    dispW: 0,
    dispH: 0,
    scale: 1,
    showCropStep: false
  });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0 });

  // QR Output Result States
  const [generatingQR, setGeneratingQR] = useState(false);
  const [qrNoteText, setQrNoteText] = useState("");
  const [qrNoteClass, setQrNoteClass] = useState("note");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [downloadError, setDownloadError] = useState("");

  // PDF Sheet State — persisted to localStorage so reloads don't lose progress
  const [appendedQrs, setAppendedQrs] = useState(() => {
    try {
      const saved = localStorage.getItem('pdfSheet_appendedQrs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [undoneQrs, setUndoneQrs] = useState(() => {
    try {
      const saved = localStorage.getItem('pdfSheet_undoneQrs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Admin tab state
  const [activeAdminTab, setActiveAdminTab] = useState('generator'); // 'generator' | 'orders'

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [appendProgress, setAppendProgress] = useState({ active: false, total: 0, done: 0, message: '' });
  const [ordersError, setOrdersError] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});

  // Dynamic Pricing states
  const [personalisedOriginal, setPersonalisedOriginal] = useState(299);
  const [personalisedDiscounted, setPersonalisedDiscounted] = useState(199);
  const [classicOriginal, setClassicOriginal] = useState(199);
  const [classicDiscounted, setClassicDiscounted] = useState(129);
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricingSuccess, setPricingSuccess] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [showLogoDownloadPrompt, setShowLogoDownloadPrompt] = useState(false);
  const [logoImage, setLogoImage] = useState(null);

  // Landing QRs Tab States
  const [landingQrs, setLandingQrs] = useState({
    tag1: { label: 'Your Pet', base64Image: '', visible: true },
    tag2: { label: 'Your Memory', base64Image: '', visible: true },
    tag3: { label: 'Your Art', base64Image: '', visible: true }
  });
  const [savingLandingQrs, setSavingLandingQrs] = useState(false);
  const [landingSuccess, setLandingSuccess] = useState("");
  const [landingError, setLandingError] = useState("");

  const [croppingLandingTag, setCroppingLandingTag] = useState(null); // 'tag1' | 'tag2' | 'tag3' | null
  const [landingCropImage, setLandingCropImage] = useState(null); // Image object being cropped
  const landingPreviewCanvasRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/full logo.png';
    img.onload = () => setLogoImage(img);
  }, []);

  // Fetch Landing QRs from Firestore on mount
  useEffect(() => {
    if (!firestoreDb) return;
    const fetchLandingQrs = async () => {
      try {
        const docRef = doc(firestoreDb, 'settings', 'landing_page_qrs');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLandingQrs({
            tag1: {
              label: data.tag1?.label || 'Your Pet',
              base64Image: data.tag1?.base64Image || '',
              visible: data.tag1?.visible !== undefined ? data.tag1.visible : true
            },
            tag2: {
              label: data.tag2?.label || 'Your Memory',
              base64Image: data.tag2?.base64Image || '',
              visible: data.tag2?.visible !== undefined ? data.tag2.visible : true
            },
            tag3: {
              label: data.tag3?.label || 'Your Art',
              base64Image: data.tag3?.base64Image || '',
              visible: data.tag3?.visible !== undefined ? data.tag3.visible : true
            }
          });
        }
      } catch (err) {
        console.warn("Failed to fetch settings/landing_page_qrs from Firestore:", err);
      }
    };
    fetchLandingQrs();
  }, [firestoreDb]);

  const handleLandingImageUpload = (tagKey, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setLandingCropImage(img);
        setCroppingLandingTag(tagKey);
        initCrop(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLandingCrop = (tagKey) => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    const s = cropState.scale || 1;
    const srcX = cropState.x * s;
    const srcY = cropState.y * s;
    const srcSize = cropState.size * s;

    try {
      ctx.drawImage(landingCropImage, srcX, srcY, srcSize, srcSize, 0, 0, 320, 320);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      setLandingQrs(prev => ({
        ...prev,
        [tagKey]: {
          ...prev[tagKey],
          base64Image: compressedBase64
        }
      }));
    } catch (e) {
      console.warn("Failed to apply crop:", e);
    }
    setCroppingLandingTag(null);
    setLandingCropImage(null);
  };

  // Render dynamic preview of landing tag in cropper
  useEffect(() => {
    if (activeAdminTab !== 'landing_qrs' || !croppingLandingTag || !landingCropImage || !landingPreviewCanvasRef.current) return;
    
    const drawPreview = async () => {
      const canvas = landingPreviewCanvasRef.current;
      canvas.width = 320;
      canvas.height = 350;
      const ctx = canvas.getContext('2d');
      
      const s = cropState.scale || 1;
      const srcX = cropState.x * s;
      const srcY = cropState.y * s;
      const srcSize = cropState.size * s;
      
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = 320;
      logoCanvas.height = 320;
      try {
        logoCanvas.getContext('2d').drawImage(landingCropImage, srcX, srcY, srcSize, srcSize, 0, 0, 320, 320);
      } catch (e) {
        console.warn("Failed to draw logoCanvas for landing preview:", e);
      }
      
      const ok = await ensureQrLib();
      if (!ok) return;
      
      let qrResult;
      try {
        qrResult = makeQR('https://im-here-qr.vercel.app/id?=preview');
      } catch (err) {
        return;
      }
      
      const { qr } = qrResult;
      const moduleCount = qr.getModuleCount();
      const qrSize = 320;
      const margin = 1.5;
      const totalModules = moduleCount + margin * 2;
      const moduleSize = qrSize / totalModules;
      const bannerH = 30; // scaled down banner
      
      // Fill background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw background image
      ctx.drawImage(logoCanvas, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw dots
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          const isFinder = (row < 7 && col < 7) || (row < 7 && col >= moduleCount - 7) || (row >= moduleCount - 7 && col < 7);
          if (isFinder) continue;
          if (qr.isDark(row, col)) {
            drawDot(ctx, row, col, margin, moduleSize, '#ffffff', 'circle', bannerH, 0.8);
          }
        }
      }
      
      // Draw corners
      drawFinder(ctx, 0, 0, margin, moduleSize, '#ffffff', '#000000', 'circle', bannerH);
      drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, '#ffffff', '#000000', 'circle', bannerH);
      drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, '#ffffff', '#000000', 'circle', bannerH);
      
      // Draw banner frame
      drawBanner(ctx, qrSize, bannerH, "SCAN ME TO FIND ME", '#000000', '#ffffff', 0);
    };
    
    drawPreview();
  }, [activeAdminTab, croppingLandingTag, landingCropImage, cropState.x, cropState.y, cropState.size, cropState.scale]);

  const handleSaveLandingQrs = async (e) => {
    e.preventDefault();
    setSavingLandingQrs(true);
    setLandingSuccess("");
    setLandingError("");
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'landing_page_qrs'), {
          ...landingQrs,
          updatedAt: new Date()
        });
        setLandingSuccess("Landing page keychains saved successfully!");
        setTimeout(() => setLandingSuccess(""), 3000);
      } catch (err) {
        console.error("Failed to save landing page keychains:", err);
        setLandingError(`Failed to save: ${err.message}`);
      } finally {
        setSavingLandingQrs(false);
      }
    } else {
      setLandingError("Database not connected.");
      setSavingLandingQrs(false);
    }
  };

  const cropCanvasRef = useRef(null);
  const qrCanvasRef = useRef(null);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const getLogoCanvas = () => {
    if (!uploadedImg) return null;
    const s = cropState.scale;
    const srcX = cropState.x * s;
    const srcY = cropState.y * s;
    const srcSize = cropState.size * s;

    const out = document.createElement('canvas');
    out.width = 320;
    out.height = 320;
    out.getContext('2d').drawImage(uploadedImg, srcX, srcY, srcSize, srcSize, 0, 0, 320, 320);
    return out;
  };

  async function handleGenerateQR(urlOverride) {
    const activeUrl = urlOverride || qrUrl;
    if (!activeUrl.trim()) {
      setQrNoteText("Enter a URL or generate a customer ID link first.");
      setQrNoteClass("note warn");
      return;
    }

    setGeneratingQR(true);
    setQrNoteText("");
    setQrNoteClass("note");

    const ok = await ensureQrLib();
    if (!ok) {
      setQrNoteText("Could not load the QR engine — check internet connection.");
      setQrNoteClass("note warn");
      setGeneratingQR(false);
      return;
    }

    let qrResult;
    try {
      qrResult = makeQR(activeUrl.trim());
    } catch (err) {
      setQrNoteText(err.message);
      setQrNoteClass("note warn");
      setGeneratingQR(false);
      return;
    }

    const { qr, level } = qrResult;
    const moduleCount = qr.getModuleCount();
    const logoCanvas = getLogoCanvas();

    const qrSize = 640;
    const margin = 1.5;
    const totalModules = moduleCount + margin * 2;
    const moduleSize = qrSize / totalModules;
    const bannerH = hasFrame ? 60 : 0;

    const canvas = qrCanvasRef.current;
    if (!canvas) {
      setGeneratingQR(false);
      return;
    }
    canvas.width = qrSize;
    canvas.height = qrSize + bannerH;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let bgImageMissing = false;
    if (bgMode === 'image') {
      if (logoCanvas) {
        ctx.drawImage(logoCanvas, 0, 0, canvas.width, canvas.height);
        if (overlayDarkness > 0) {
          ctx.fillStyle = `rgba(0,0,0,${overlayDarkness / 100})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        bgImageMissing = true;
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

    // Draw Logo Chip
    if (logoCanvas && showLogoChip) {
      drawLogo(ctx, logoCanvas, qrSize, bannerH, logoScale / 100, bgColor);
    }

    // Draw banner frame (at the top)
    if (hasFrame) {
      drawBanner(ctx, qrSize, bannerH, frameText, frameBgColor, frameTextColor, 0);
    }

    // Warnings and notes mapping
    if (bgImageMissing) {
      setQrNoteText("Upload an image first to use full-image background — used solid color instead.");
      setQrNoteClass("note warn");
    } else if (logoCanvas && showLogoChip && level !== 'H') {
      setQrNoteText(`Your text is long, so error correction dropped to ${level}. Test-scan this.`);
      setQrNoteClass("note warn");
    } else if (bgMode === 'image' && level !== 'H') {
      setQrNoteText(`Your text is long, so error correction dropped to ${level}. Full-image background needs scan testing.`);
      setQrNoteClass("note warn");
    } else if (logoCanvas) {
      setQrNoteText("Generated with high error correction. Test-scan before printing.");
    } else {
      setQrNoteText("");
    }

    setQrImageUrl(canvas.toDataURL('image/png'));
    setHasBeenGeneratedOnce(true);
    setGeneratingQR(false);
  }

  // Auto-regenerate QR code on any layout/style/parameter change
  useEffect(() => {
    if (qrUrl.trim()) {
      handleGenerateQR();
    } else {
      setQrImageUrl("");
      setQrNoteText("");
    }
  }, [
    qrUrl,
    uploadedImg,
    dotColor,
    bgColor,
    bgMode,
    overlayDarkness,
    showLogoChip,
    dotSize,
    dotShape,
    cornerShape,
    hasFrame,
    frameText,
    frameBgColor,
    frameTextColor,
    logoScale,
    cropState.x,
    cropState.y,
    cropState.size,
    makeQR,
    drawDot,
    drawFinder,
    drawLogo,
    drawBanner
  ]);

  // Render crop preview canvas
  useEffect(() => {
    if (cropState.showCropStep && cropCanvasRef.current) {
      const activeImg = activeAdminTab === 'landing_qrs' ? landingCropImage : uploadedImg;
      if (activeImg) {
        const ctx = cropCanvasRef.current.getContext('2d');
        cropCanvasRef.current.width = cropState.dispW;
        cropCanvasRef.current.height = cropState.dispH;
        ctx.drawImage(activeImg, 0, 0, cropState.dispW, cropState.dispH);
      }
    }
  }, [cropState.showCropStep, cropState.dispW, cropState.dispH, uploadedImg, landingCropImage, activeAdminTab]);

  // Handle keyboard crop box movement (1px precision nudges)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!cropState.showCropStep) return;

      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = 1;
        setCropState(prev => {
          let nextX = prev.x;
          let nextY = prev.y;
          if (e.key === 'ArrowLeft') nextX = clamp(prev.x - step, 0, prev.dispW - prev.size);
          if (e.key === 'ArrowRight') nextX = clamp(prev.x + step, 0, prev.dispW - prev.size);
          if (e.key === 'ArrowUp') nextY = clamp(prev.y - step, 0, prev.dispH - prev.size);
          if (e.key === 'ArrowDown') nextY = clamp(prev.y + step, 0, prev.dispH - prev.size);
          return { ...prev, x: nextX, y: nextY };
        });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cropState.showCropStep]);

  // Auto-save PDF sheet to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('pdfSheet_appendedQrs', JSON.stringify(appendedQrs));
    } catch { /* storage full — silently ignore */ }
  }, [appendedQrs]);

  useEffect(() => {
    try {
      localStorage.setItem('pdfSheet_undoneQrs', JSON.stringify(undoneQrs));
    } catch { /* storage full — silently ignore */ }
  }, [undoneQrs]);

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

  // Fetch prices from Firestore settings/prices on mount
  useEffect(() => {
    // Try local fallback first
    try {
      const saved = localStorage.getItem('imhere_prices');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.personalisedOriginal !== undefined) setPersonalisedOriginal(data.personalisedOriginal);
        if (data.personalisedDiscounted !== undefined) setPersonalisedDiscounted(data.personalisedDiscounted);
        if (data.classicOriginal !== undefined) setClassicOriginal(data.classicOriginal);
        if (data.classicDiscounted !== undefined) setClassicDiscounted(data.classicDiscounted);
      }
    } catch {}

    if (!firestoreDb) return;
    const fetchPrices = async () => {
      try {
        const docRef = doc(firestoreDb, 'settings', 'prices');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.personalisedOriginal !== undefined) setPersonalisedOriginal(data.personalisedOriginal);
          if (data.personalisedDiscounted !== undefined) setPersonalisedDiscounted(data.personalisedDiscounted);
          if (data.classicOriginal !== undefined) setClassicOriginal(data.classicOriginal);
          if (data.classicDiscounted !== undefined) setClassicDiscounted(data.classicDiscounted);
        }
      } catch (err) {
        console.warn("Failed to fetch settings/prices from Firestore:", err);
      }
    };
    fetchPrices();
  }, [firestoreDb]);

  const handleSavePrices = async (e) => {
    e.preventDefault();
    setSavingPrices(true);
    setPricingSuccess("");
    setPricingError("");
    
    const pricesObj = {
      personalisedOriginal: Number(personalisedOriginal),
      personalisedDiscounted: Number(personalisedDiscounted),
      classicOriginal: Number(classicOriginal),
      classicDiscounted: Number(classicDiscounted)
    };

    // 1. Save to localStorage immediately so it reflects locally
    try {
      localStorage.setItem('imhere_prices', JSON.stringify(pricesObj));
    } catch {}

    // 2. Save to Firestore for remote sync
    if (firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'settings', 'prices'), {
          ...pricesObj,
          updatedAt: new Date()
        });
        setPricingSuccess("Prices saved successfully to Firestore & Local Storage!");
        setTimeout(() => setPricingSuccess(""), 3000);
      } catch (err) {
        console.error("Failed to save prices to Firestore:", err);
        setPricingError(`Saved locally only. Firestore failed: ${err.message}. (Check Firestore Security Rules to allow writes to '/settings/prices')`);
      } finally {
        setSavingPrices(false);
      }
    } else {
      setPricingSuccess("Saved locally! (Database offline/initializing)");
      setTimeout(() => setPricingSuccess(""), 3000);
      setSavingPrices(false);
    }
  };

  // Prevent reload if there are appended QR codes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (appendedQrs.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have appended QR codes. If you reload, you may lose your current progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [appendedQrs]);

  // Real-time listener for orders with orderStatus === 'orderplaced'
  useEffect(() => {
    if (!firestoreDb || activeAdminTab !== 'orders') return;
    setOrdersLoading(true);
    setOrdersError('');
    const q = query(
      collection(firestoreDb, 'orders'),
      where('orderStatus', '==', 'orderplaced'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(docs);
      setOrdersLoading(false);
    }, (err) => {
      console.error('Orders listener error:', err);
      setOrdersError('Failed to load orders: ' + err.message);
      setOrdersLoading(false);
    });
    return () => unsubscribe();
  }, [firestoreDb, activeAdminTab]);

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

  // Helper: load customer's image from Storage and create a cropped logoCanvas
  const loadLogoCanvas = (imageUrl, srcX, srcY, srcSize) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const out = document.createElement('canvas');
        out.width = 320;
        out.height = 320;
        try {
          out.getContext('2d').drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, 320, 320);
        } catch (e) {
          console.warn('loadLogoCanvas drawImage failed:', e);
        }
        resolve(out);
      };
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  };

  // Helper: generate a QR code dataUrl for a given URL + order item type
  const generateQrDataUrlForOrder = async (url, typeofqr, logoCanvas) => {
    const ok = await ensureQrLib();
    if (!ok) throw new Error('QR library unavailable');

    let qrResult;
    try {
      qrResult = makeQR(url);
    } catch (err) {
      throw new Error(`makeQR failed: ${err.message}`);
    }

    const { qr } = qrResult;
    const moduleCount = qr.getModuleCount();
    const qrSize = 640;
    const margin = 1.5;
    const totalModules = moduleCount + margin * 2;
    const moduleSize = qrSize / totalModules;
    const bannerH = 60;

    // Set colors based on typeofqr
    let dotColor = '#ffffff';
    let bgColor = '#000000';
    const bgMode = typeofqr === 'personalised' ? 'image' : 'solid';
    let frameBgColor = '#000000';
    let frameTextColor = '#ffffff';

    if (typeofqr === 'classic_white') {
      dotColor = '#111111';
      bgColor = '#ffffff';
      frameBgColor = '#111111';
    } else if (typeofqr === 'classic_black') {
      dotColor = '#ffffff';
      bgColor = '#000000';
    } else if (typeofqr === 'personalised') {
      dotColor = '#ffffff';
      bgColor = '#000000';
    }

    const canvas = document.createElement('canvas');
    canvas.width = qrSize;
    canvas.height = qrSize + bannerH;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image background for personalised
    if (bgMode === 'image' && logoCanvas) {
      ctx.drawImage(logoCanvas, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
          drawDot(ctx, row, col, margin, moduleSize, dotColor, 'circle', bannerH, 0.8);
        }
      }
    }

    // Draw corners
    drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
    drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);
    drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, 'circle', bannerH);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw banner
    drawBanner(ctx, qrSize, bannerH, 'SCAN ME TO FIND ME', frameBgColor, frameTextColor, 0);

    return canvas.toDataURL('image/png');
  };

  // Action: Append All orders to PDF
  const handleAppendAllToPdf = async () => {
    if (orders.length === 0 || appendProgress.active) return;

    const totalQrs = orders.reduce((sum, order) =>
      sum + (order.items || []).reduce((s, item) => s + (item.quantity || 1), 0), 0
    );

    if (totalQrs === 0) return;

    setAppendProgress({ active: true, total: totalQrs, done: 0, message: 'Starting up...' });

    const newEntries = [];
    let done = 0;

    try {
      for (const order of orders) {
        for (const item of (order.items || [])) {
          let logoCanvas = null;

          // Load customer image for personalised QR
          if (item.typeofqr === 'personalised' && item.imageUrl) {
            setAppendProgress(prev => ({ ...prev, message: `Loading personalised image...` }));
            logoCanvas = await loadLogoCanvas(
              item.imageUrl,
              item.srcCropX || 0,
              item.srcCropY || 0,
              item.srcCropSize || 320
            );
          }

          for (let q = 0; q < (item.quantity || 1); q++) {
            setAppendProgress(prev => ({
              ...prev,
              message: `Generating QR ${done + 1} of ${totalQrs}...`
            }));

            // Generate unique ID
            const newId = await getUniqueId();
            const url = `${predefinedDomain}/id?=${newId}`;

            // Generate QR image
            const qrDataUrl = await generateQrDataUrlForOrder(url, item.typeofqr, logoCanvas);

            // Save ID to Firestore links with order metadata
            await setDoc(doc(firestoreDb, 'links', newId), {
              id: newId,
              domain: predefinedDomain,
              createdAt: new Date(),
              status: 'unregistered',
              orderedPhoneNumber: order.orderedPhoneNumber || '',
              orderedEmail: order.orderedEmail || '',
              typeofqr: item.typeofqr || 'classic_black',
              firestoreOrderId: order.id
            });

            newEntries.push({ qrUrl: qrDataUrl, id: newId, orderedPhoneNumber: order.orderedPhoneNumber });
            done++;
            setAppendProgress(prev => ({ ...prev, done, message: `Generated ${done} of ${totalQrs} QR codes...` }));
          }
        }

        // Mark this order as appended
        await updateDoc(doc(firestoreDb, 'orders', order.id), {
          orderStatus: 'appended'
        });
      }

      // Append all new QRs to the PDF sheet
      setAppendedQrs(prev => [...prev, ...newEntries]);
      setUndoneQrs([]);
      setAppendProgress({ active: false, total: 0, done: 0, message: `Done! Added ${totalQrs} QR codes to PDF.` });

      // Clear success message after 3 seconds
      setTimeout(() => setAppendProgress({ active: false, total: 0, done: 0, message: '' }), 3000);

    } catch (err) {
      console.error('Append all failed:', err);
      setAppendProgress({ active: false, total: 0, done: 0, message: '' });
      setOrdersError(`Append failed: ${err.message}`);
    }
  };

  const handleAppendToPdf = () => {
    if (!qrImageUrl) {
      setDownloadError("Please generate a QR code first.");
      return;
    }

    // Store both the image and the ID together so undo can delete the right DB entry
    const entry = { qrUrl: qrImageUrl, id: result?.id || null };
    setAppendedQrs(prev => [...prev, entry]);
    setUndoneQrs([]); // Clear redo stack on new action

    // Save the customer ID to Firestore immediately on append
    if (result) {
      if (!result.isSavedToDb) {
        saveResultToFirestore(result).catch((err) => {
          console.error("Append: Firestore save failed:", err);
        });
      }
    }
  };

  const handleRemoveLastQr = () => {
    if (appendedQrs.length === 0) return;
    const lastItem = appendedQrs[appendedQrs.length - 1];
    const remaining = appendedQrs.slice(0, -1);
    setAppendedQrs(remaining);
    setUndoneQrs(prev => [...prev, lastItem]);

    // Delete the ID from Firestore on undo — but only if it's not still present elsewhere on the sheet
    const entryId = lastItem?.id;
    if (entryId && firestoreDb) {
      const stillOnSheet = remaining.some(e => e?.id === entryId);
      if (!stillOnSheet) {
        deleteDoc(doc(firestoreDb, 'links', entryId)).catch(err => {
          console.error("Undo: Firestore delete failed:", err);
        });
      }
    }
  };

  const handleRedoLastQr = () => {
    if (undoneQrs.length === 0) return;
    const nextItem = undoneQrs[undoneQrs.length - 1];
    setUndoneQrs(prev => prev.slice(0, -1));
    setAppendedQrs(prev => [...prev, nextItem]);

    // Re-save the ID to Firestore on redo
    const entryId = nextItem?.id;
    if (entryId && firestoreDb) {
      const docRef = doc(firestoreDb, 'links', entryId);
      setDoc(docRef, {
        id: entryId,
        domain: predefinedDomain,
        createdAt: new Date(),
        status: 'unregistered'
      }).catch(err => {
        console.error("Redo: Firestore re-save failed:", err);
      });
    }
  };

  const handleClearPdfSheet = () => {
    if (appendedQrs.length === 0) return;
    const confirmClear = window.confirm("Are you sure you want to clear all appended QR codes from this sheet?");
    if (confirmClear) {
      // Delete every unique ID from Firestore
      if (firestoreDb) {
        const uniqueIds = [...new Set(appendedQrs.map(e => e?.id).filter(Boolean))];
        uniqueIds.forEach(id => {
          deleteDoc(doc(firestoreDb, 'links', id)).catch(err => {
            console.error("Clear sheet: Firestore delete failed:", err);
          });
        });
      }
      setAppendedQrs([]);
      setUndoneQrs([]);
      localStorage.removeItem('pdfSheet_appendedQrs');
      localStorage.removeItem('pdfSheet_undoneQrs');
    }
  };

  const renderGuideOverlay = (pageIdx, slotIdx) => {
    return null;
  };

  const handleDownloadPdf = () => {
    if (appendedQrs.length === 0) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const itemsPerPage = 16;
    const colWidth = 45;
    const rowHeight = 60;
    const marginX = 12;
    const marginY = 22.5;
    const gapX = 2;
    const gapY = 4;

    appendedQrs.forEach((entry, index) => {
      // Support both new {qrUrl, id} objects and legacy plain-string URLs from old localStorage
      const qrUrl = entry?.qrUrl ?? entry;
      const pageIndex = index % itemsPerPage;

      // Page division
      if (index > 0 && pageIndex === 0) {
        pdf.addPage();
      }

      const row = Math.floor(pageIndex / 4);
      const col = pageIndex % 4;

      const x = marginX + col * (colWidth + gapX);
      const y = marginY + row * (rowHeight + gapY);

      // 1. Draw outer grey border (45mm x 60mm)
      pdf.setDrawColor(209, 213, 219); // light grey (#d1d5db)
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, colWidth, rowHeight);

      // 2. Add QR image centered (40mm x 55mm), leaving 2.5mm margin on all sides
      pdf.addImage(qrUrl, "PNG", x + 2.5, y + 2.5, 40, 55);

      // 3. Draw dimension guides around the first card on each page for measurement reference
      if (pageIndex === 0) {
        pdf.saveGraphicsState();

        // Define arrow helper inside to prevent polluting scope
        const drawArrow = (x1, y1, x2, y2, size = 0.8) => {
          pdf.line(x1, y1, x2, y2);
          const angle = Math.atan2(y2 - y1, x2 - x1);

          // tip at x1, y1
          const x1_a = x1 + size * Math.cos(angle + Math.PI / 6);
          const y1_a = y1 + size * Math.sin(angle + Math.PI / 6);
          const x1_b = x1 + size * Math.cos(angle - Math.PI / 6);
          const y1_b = y1 + size * Math.sin(angle - Math.PI / 6);
          pdf.triangle(x1, y1, x1_a, y1_a, x1_b, y1_b, "F");

          // tip at x2, y2
          const x2_a = x2 - size * Math.cos(angle + Math.PI / 6);
          const y2_a = y2 - size * Math.sin(angle + Math.PI / 6);
          const x2_b = x2 - size * Math.cos(angle - Math.PI / 6);
          const y2_b = y2 - size * Math.sin(angle - Math.PI / 6);
          pdf.triangle(x2, y2, x2_a, y2_a, x2_b, y2_b, "F");
        };

        // Define extension line helper
        const drawExtension = (x1, y1, x2, y2) => {
          pdf.saveGraphicsState();
          pdf.setLineWidth(0.08);
          pdf.line(x1, y1, x2, y2);
          pdf.restoreGraphicsState();
        };

        // Red color for Outer Box Dimensions
        pdf.setDrawColor(220, 38, 38);
        pdf.setFillColor(220, 38, 38);
        pdf.setTextColor(220, 38, 38);
        pdf.setLineWidth(0.15);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);

        // Card Width (45 mm) Above Card
        const yLine1 = y - 4;
        drawArrow(x, yLine1, x + colWidth, yLine1, 0.8);
        drawExtension(x, y, x, yLine1 - 0.5);
        drawExtension(x + colWidth, y, x + colWidth, yLine1 - 0.5);
        pdf.text(`${colWidth} mm`, x + colWidth / 2, yLine1 - 0.8, { align: "center" });

        // Card Height (60 mm) Left of Card
        const xLine1 = x - 4;
        drawArrow(xLine1, y, xLine1, y + rowHeight, 0.8);
        drawExtension(x, y, xLine1 - 0.5, y);
        drawExtension(x, y + rowHeight, xLine1 - 0.5, y + rowHeight);
        pdf.text(`${rowHeight} mm`, xLine1 - 1.2, y + rowHeight / 2, { align: "center" });

        // Blue color for Inner QR Dimensions
        pdf.setDrawColor(37, 99, 235);
        pdf.setFillColor(37, 99, 235);
        pdf.setTextColor(37, 99, 235);

        // QR Width (40 mm) Inside Card Bottom
        const yLine2 = y + rowHeight + 3;
        drawArrow(x + 2.5, yLine2, x + colWidth - 2.5, yLine2, 0.8);
        drawExtension(x + 2.5, y + rowHeight, x + 2.5, yLine2 + 0.5);
        drawExtension(x + colWidth - 2.5, y + rowHeight, x + colWidth - 2.5, yLine2 + 0.5);
        pdf.text("40 mm", x + colWidth / 2, yLine2 - 0.6, { align: "center" });

        // QR Height (55 mm) Right of Card
        const xLine2 = x + colWidth + 3;
        drawArrow(xLine2, y + 2.5, xLine2, y + rowHeight - 2.5, 0.8);
        drawExtension(x + colWidth, y + 2.5, xLine2 + 0.5, y + 2.5);
        drawExtension(x + colWidth, y + rowHeight - 2.5, xLine2 + 0.5, y + rowHeight - 2.5);
        pdf.text("55 mm", xLine2 + 1, y + rowHeight / 2, { align: "left" });

        // Green color for Margins & Gaps
        pdf.setDrawColor(16, 185, 129);
        pdf.setFillColor(16, 185, 129);
        pdf.setTextColor(16, 185, 129);

        // Left Padding (2.5 mm) Inside Card Top
        drawArrow(x, y + 8, x + 2.5, y + 8, 0.5);
        pdf.text("2.5 mm margin", x + 1.25, y + 7.2, { align: "center" });

        // Column Gap (2 mm) between Col 0 and Col 1
        const xGap = x + colWidth;
        const yGap1 = y - 9;
        drawArrow(xGap, yGap1, xGap + gapX, yGap1, 0.5);
        drawExtension(xGap, y, xGap, yGap1 - 0.5);
        drawExtension(xGap + gapX, y, xGap + gapX, yGap1 - 0.5);
        pdf.text(`${gapX} mm`, xGap + gapX / 2, yGap1 - 0.8, { align: "center" });

        // Row Gap (4 mm) between Row 0 and Row 1
        const yGap2 = y + rowHeight;
        const xGap2 = x - 9;
        drawArrow(xGap2, yGap2, xGap2, yGap2 + gapY, 0.5);
        drawExtension(x, yGap2, xGap2 - 0.5, yGap2);
        drawExtension(x, yGap2 + gapY, xGap2 - 0.5, yGap2 + gapY);
        pdf.text(`${gapY} mm`, xGap2 - 1.2, yGap2 + gapY / 2, { align: "center" });

        pdf.restoreGraphicsState();
      }
    });

    pdf.save("qr-print-sheet.pdf");
    setShowLogoDownloadPrompt(true);
  };

  const handleDownloadLogoPdf = () => {
    if (appendedQrs.length === 0) return;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const itemsPerPage = 16;
    const colWidth = 45;
    const rowHeight = 60;
    const marginX = 12;
    const marginY = 22.5;
    const gapX = 2;
    const gapY = 4;

    appendedQrs.forEach((entry, index) => {
      const pageIndex = index % itemsPerPage;

      if (index > 0 && pageIndex === 0) {
        pdf.addPage();
      }

      const row = Math.floor(pageIndex / 4);
      const col = pageIndex % 4;

      const x = marginX + col * (colWidth + gapX);
      const y = marginY + row * (rowHeight + gapY);

      // 1. Draw outer grey border (45mm x 60mm)
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, colWidth, rowHeight);

      // 2. Add brand logo in full cover (45mm x 60mm)
      if (logoImage) {
        pdf.addImage(logoImage, "PNG", x, y, colWidth, rowHeight);
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text("I'm Here Logo", x + colWidth / 2, y + rowHeight / 2, { align: "center" });
      }
    });

    pdf.save("logo-print-sheet.pdf");
    setShowLogoDownloadPrompt(false);
  };

  // Helper: Save generated customer link to Firestore database on demand
  const saveResultToFirestore = async (currentResult) => {
    if (!firestoreDb || !currentResult || currentResult.isSavedToDb) return currentResult;
    try {
      const docRef = doc(firestoreDb, 'links', currentResult.id);
      await setDoc(docRef, {
        id: currentResult.id,
        domain: currentResult.domain,
        createdAt: new Date(),
        status: 'unregistered'
      });
      const updated = { ...currentResult, isSavedToDb: true };
      setResult(updated);
      return updated;
    } catch (err) {
      console.error("Failed to save customer link to database:", err);
      setError(`Failed to save customer link to database: ${err.message}`);
      throw err;
    }
  };

  // Action: Generate ID for new Customer (locally first, deferred database save)
  const handleGenerateId = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setAdminSuccess("");
    setAdminError("");

    try {
      const uniqueId = await getUniqueId(); // reads firestore to ensure uniqueness
      const generatedUrl = `${predefinedDomain}/id?=${uniqueId}`;
      setResult({
        domain: predefinedDomain,
        id: uniqueId,
        url: generatedUrl,
        isSavedToDb: false
      });
      setQrUrl(generatedUrl);
      handleGenerateQR(generatedUrl);
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message}.`);
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

      const deletableDocs = querySnapshot.docs.filter(docSnap => docSnap.id !== 'v16o66eq');

      if (deletableDocs.length === 0) {
        setAdminSuccess("Database is already empty (except for your protected ID v16o66eq)!");
        setShowConfirm(false);
        return;
      }

      const deletePromises = deletableDocs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      setResult(null);
      setQrImageUrl("");
      setHasBeenGeneratedOnce(false);
      setAdminSuccess("All documents deleted successfully (except for your protected ID v16o66eq)!");
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      setAdminError(`Failed to clear database: ${err.message}. Check Firestore Rules.`);
    } finally {
      setClearing(false);
    }
  };

  // Action: Copy link to clipboard
  const handleCopyLink = async () => {
    if (!result) return;
    if (!result.isSavedToDb) {
      try {
        await saveResultToFirestore(result);
      } catch (err) {
        console.error("Copy link save failed:", err);
        return;
      }
    }
    navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Image Upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImg(img);
        initCrop(img);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const initCrop = (img) => {
    const maxW = 280;
    const scaleDown = Math.min(1, maxW / img.width);
    const dispW = Math.round(img.width * scaleDown);
    const dispH = Math.round(img.height * scaleDown);
    const initSize = Math.round(Math.min(dispW, dispH) * 0.6);

    setCropState({
      x: (dispW - initSize) / 2,
      y: (dispH - initSize) / 2,
      size: initSize,
      dispW,
      dispH,
      scale: img.width / dispW,
      showCropStep: true
    });
  };



  const handleCropBoxDown = (e) => {
    setDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      boxX: cropState.x,
      boxY: cropState.y
    });
    e.target.setPointerCapture(e.pointerId);
  };

  const handleCropBoxMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCropState(prev => ({
      ...prev,
      x: clamp(dragStart.boxX + dx, 0, prev.dispW - prev.size),
      y: clamp(dragStart.boxY + dy, 0, prev.dispH - prev.size)
    }));
  };

  const handleCropBoxUp = () => {
    setDragging(false);
  };

  const handleCropSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    const cx = cropState.x + cropState.size / 2;
    const cy = cropState.y + cropState.size / 2;
    setCropState(prev => {
      const nextX = clamp(cx - newSize / 2, 0, prev.dispW - newSize);
      const nextY = clamp(cy - newSize / 2, 0, prev.dispH - newSize);
      return {
        ...prev,
        size: newSize,
        x: nextX,
        y: nextY
      };
    });
  };



  const handleDownload = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas || !canvas.width) {
      setDownloadError("Generate a QR code first.");
      return;
    }

    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          setDownloadError("Direct download unavailable. Right click to save.");
          return;
        }
        const dlUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'branded-qr-code.png';
        link.href = dlUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1500);
      }, 'image/png');
    } catch (e) {
      setDownloadError("Direct download unavailable. Right click to save.");
    }

    // Save generated customer link to Firestore in the background
    if (result && !result.isSavedToDb) {
      saveResultToFirestore(result).catch((err) => {
        console.error("Background Firestore save failed:", err);
      });
    }
  };

  const handlePresetSelect = (preset) => {
    setDotColor(preset.dot);
    setBgColor(preset.bg);
  };

  const handleNew = () => {
    // Reset ID generation results
    setResult(null);
    setCopied(false);
    setError("");

    // Reset QR configuration states
    setQrUrl("");
    setUploadedImg(null);
    setDotColor("#ffffff");
    setBgColor("#000000");
    setBgMode("image");
    setHasBeenGeneratedOnce(false);
    setOverlayDarkness(40);
    setShowLogoChip(false);
    setDotSize(80);
    setDotShape("circle");
    setCornerShape("circle");
    setHasFrame(true);
    setFrameText("SCAN ME TO FIND ME");
    setFrameBgColor("#000000");
    setFrameTextColor("#ffffff");
    setLogoScale(22);

    // Reset crop state
    setCropState({
      x: 0,
      y: 0,
      size: 120,
      dispW: 0,
      dispH: 0,
      scale: 1,
      showCropStep: false
    });

    // Reset notes/alerts
    setQrNoteText("");
    setQrImageUrl("");
    setDownloadError("");
  };

  return (
    <div className="app-container" style={{ maxWidth: '1100px', alignSelf: 'center' }}>
      {/* Header */}
      <header className="admin-header-wrapper">
        <div className="admin-header-main">
          <h1 style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo icon.png" alt="I'm here" style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '14px', borderRadius: '8px' }} />
            I'm here
          </h1>
          <p>Admin Cockpit — Generate customer IDs and design branded QR codes side-by-side</p>
        </div>

        <div className="admin-header-actions">
          {/* Tab switcher buttons */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setActiveAdminTab('generator')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeAdminTab === 'generator' ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: activeAdminTab === 'generator' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              QR Generator
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('orders')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeAdminTab === 'orders' ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: activeAdminTab === 'orders' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ShoppingBag size={13} /> Orders
              {orders.length > 0 && (
                <span style={{
                  background: 'var(--accent-rose)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1
                }}>{orders.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('landing_qrs')}
              style={{
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: activeAdminTab === 'landing_qrs' ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: activeAdminTab === 'landing_qrs' ? '#a5b4fc' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🎨 Landing QRs
            </button>
          </div>

          {/* New Button */}
          <button
            type="button"
            onClick={handleNew}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reset Form / New Tag"
          >
            <Plus size={14} />
            New
          </button>

          {/* Compact Clear DB Control */}
          {!showConfirm ? (
            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={() => { setShowConfirm(true); setCountdown(3); }}
              disabled={loading || clearing}
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                border: '1px solid rgba(244, 63, 94, 0.2)',
                color: 'var(--accent-rose)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Clear Database"
            >
              <Trash2 size={14} />
              Clear DB
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', padding: '4px 8px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-rose)' }}>Wipe DB?</span>
              <button
                type="button"
                className="btn-confirm-no"
                onClick={() => { setShowConfirm(false); setCountdown(0); }}
                disabled={clearing}
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                No
              </button>
              <button
                type="button"
                className="btn-confirm-yes"
                onClick={handleClearDatabase}
                disabled={clearing || countdown > 0}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'var(--accent-rose)',
                  color: 'white',
                  fontWeight: 'bold',
                  opacity: countdown > 0 ? 0.6 : 1,
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {clearing ? '...' : countdown > 0 ? `${countdown}s` : 'Yes'}
              </button>
            </div>
          )}

          {/* Logout Button */}
          <button
            type="button"
            onClick={onLogout}
            className="btn"
            style={{
              padding: '8px 14px',
              fontSize: '0.85rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Logout Admin"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* DB Admin Status Messages */}
      {(adminSuccess || adminError) && (
        <div style={{ marginBottom: '24px' }}>
          {adminSuccess && (
            <div className="status-msg status-msg-success">
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{adminSuccess}</span>
            </div>
          )}
          {adminError && (
            <div className="status-msg status-msg-error">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{adminError}</span>
            </div>
          )}
        </div>
      )}

      {/* Two-Column Cockpit Layout */}
      {activeAdminTab === 'generator' && (
      <div className="dashboard-grid">

        {/* Left Column: Configuration Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Card 1: ID Generator Input */}
          <main className="glass-panel card-content">
            <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
              1. Customer ID Generation
            </h2>
            <form onSubmit={handleGenerateId} className="form-group">
              <label htmlFor="domainInput" className="form-label" style={{ fontSize: '0.75rem' }}>
                Predefined Host Domain
              </label>
              <div className="input-wrapper">
                <Globe className="input-icon" size={20} />
                <input
                  id="domainInput"
                  type="text"
                  className="text-input"
                  value={predefinedDomain + "/"}
                  disabled={true}
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
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
                disabled={loading || clearing}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Checking DB & Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Customer Link
                  </>
                )}
              </button>
            </form>
          </main>

          {/* Card 2: QR Designer Inputs */}
          <section className="glass-panel card-content">
            <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
              2. Branded QR Code Design
            </h2>

            {/* QR URL Input */}
            <div className="form-group">
              <label htmlFor="qrUrlInput" className="form-label" style={{ fontSize: '0.75rem' }}>
                QR Destination URL
              </label>
              <div className="input-wrapper">
                <Globe className="input-icon" size={20} />
                <input
                  id="qrUrlInput"
                  type="text"
                  className="text-input"
                  placeholder="Generate ID first or type manually..."
                  value={qrUrl}
                  onChange={(e) => setQrUrl(e.target.value)}
                />
              </div>
            </div>

            {/* Logo File upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Logo / Center graphic (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="file"
                  id="qrImageInput"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-danger-outline"
                  style={{ flex: 1, borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => document.getElementById('qrImageInput').click()}
                >
                  <ImageIcon size={18} />
                  {uploadedImg ? "Change Logo Image" : "Upload Logo Image"}
                </button>

                {uploadedImg && (
                  <button
                    type="button"
                    className="btn btn-danger-outline"
                    title="Remove uploaded image"
                    style={{ padding: '10px 14px', borderStyle: 'solid', flexShrink: 0 }}
                    onClick={() => {
                      setUploadedImg(null);
                      setCropState({ x: 0, y: 0, size: 120, dispW: 0, dispH: 0, scale: 1, showCropStep: false });
                      document.getElementById('qrImageInput').value = '';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Cropper step */}
              {cropState.showCropStep && (
                <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)' }}>
                  <div
                    style={{
                      position: 'relative',
                      margin: '10px auto',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      width: `${cropState.dispW}px`,
                      height: `${cropState.dispH}px`,
                      touchAction: 'none'
                    }}
                  >
                    <canvas ref={cropCanvasRef} style={{ display: 'block' }} />
                    <div
                      onPointerDown={handleCropBoxDown}
                      onPointerMove={handleCropBoxMove}
                      onPointerUp={handleCropBoxUp}
                      onPointerCancel={handleCropBoxUp}
                      style={{
                        position: 'absolute',
                        border: '1px solid rgba(255, 255, 255, 0.45)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        cursor: dragging ? 'grabbing' : 'grab',
                        borderRadius: '2px',
                        width: `${cropState.size}px`,
                        height: `${cropState.size}px`,
                        left: `${cropState.x}px`,
                        top: `${cropState.y}px`
                      }}
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
                    </div>
                  </div>

                  <p className="hint" style={{ textAlign: 'center', fontSize: '0.75rem' }}>
                    Drag the dashed square to select the logo.
                  </p>

                  <div className="form-group" style={{ marginTop: '10px' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Selection crop size:</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                    </label>
                    <input
                      type="range"
                      min="30"
                      max={Math.min(cropState.dispW, cropState.dispH)}
                      value={cropState.size}
                      onChange={handleCropSizeChange}
                      style={{ width: '100%', accentColor: '#e8402c' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Logo scale on QR:</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>{logoScale}%</span>
                    </label>
                    <input
                      type="range"
                      min="14"
                      max="30"
                      value={logoScale}
                      onChange={(e) => setLogoScale(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#e8402c' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Color controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="color-field">
                  <input
                    type="color"
                    value={dotColor}
                    onChange={(e) => setDotColor(e.target.value)}
                    className="color-picker-input"
                  />
                  <label className="color-picker-label">Dot Color</label>
                </div>

                <div className="color-field">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="color-picker-input"
                  />
                  <label className="color-picker-label">Background</label>
                </div>
              </div>

              {/* Color Presets */}
              <div className="presets">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="preset-btn"
                    style={{
                      borderColor: preset.dot,
                      background: preset.bg,
                      color: preset.dot,
                    }}
                    title={preset.name}
                  >
                    Aa
                  </button>
                ))}
              </div>

              {/* Background Mode */}
              <div className="form-group" style={{ marginTop: '6px' }}>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Mode</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setBgMode("solid"); setShowLogoChip(true); }}
                    className={`mode-btn ${bgMode === 'solid' ? 'active' : ''}`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBgMode("image"); setShowLogoChip(false); }}
                    className={`mode-btn ${bgMode === 'image' ? 'active' : ''}`}
                  >
                    Full Image
                  </button>
                </div>
                {!uploadedImg && bgMode === 'image' && (
                  <p className="hint" style={{ color: 'var(--accent-rose)', fontSize: '0.75rem' }}>Upload an image to enable Full Image background</p>
                )}
              </div>

              {bgMode === 'image' && uploadedImg && (
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Image overlay darkness:</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>{overlayDarkness}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={overlayDarkness}
                    onChange={(e) => setOverlayDarkness(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#e8402c' }}
                  />
                </div>
              )}

              {bgMode !== 'image' && (
                <div className="checkbox-row" style={{ marginTop: '4px' }}>
                  <input
                    type="checkbox"
                    id="reactLogoChipToggle"
                    checked={showLogoChip}
                    onChange={(e) => setShowLogoChip(e.target.checked)}
                  />
                  <label htmlFor="reactLogoChipToggle" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Show logo chip in center</label>
                </div>
              )}

              {/* Dot Size */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dot Size:</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{dotSize}%</span>
                </label>
                <input
                  type="range"
                  min="35"
                  max="100"
                  value={dotSize}
                  onChange={(e) => setDotSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#e8402c' }}
                />
              </div>

              {/* Dot Shape */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Dot Shape</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['square', 'rounded', 'circle'].map(shape => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setDotShape(shape)}
                      className={`shape-btn ${dotShape === shape ? 'active' : ''}`}
                    >
                      {shape === 'square' ? '■ Square' : shape === 'rounded' ? '▢ Rounded' : '● Circle'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Style */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Corner (Eye) Style</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['square', 'rounded', 'circle'].map(shape => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setCornerShape(shape)}
                      className={`corner-btn ${cornerShape === shape ? 'active' : ''}`}
                    >
                      {shape === 'square' ? '■ Square' : shape === 'rounded' ? '▢ Rounded' : '● Circle'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame toggle */}
              <div className="checkbox-row" style={{ marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="reactFrameToggle"
                  checked={hasFrame}
                  onChange={(e) => setHasFrame(e.target.checked)}
                />
                <label htmlFor="reactFrameToggle" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Add frame text below</label>
              </div>

              {hasFrame && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div className="form-group">
                    <label htmlFor="reactFrameText" className="form-label" style={{ fontSize: '0.75rem' }}>Banner text</label>
                    <input
                      type="text"
                      id="reactFrameText"
                      className="text-input"
                      value={frameText}
                      onChange={(e) => setFrameText(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div className="color-field">
                      <input
                        type="color"
                        value={frameBgColor}
                        onChange={(e) => setFrameBgColor(e.target.value)}
                        className="color-picker-input"
                      />
                      <label className="color-picker-label">Frame Bg</label>
                    </div>

                    <div className="color-field">
                      <input
                        type="color"
                        value={frameTextColor}
                        onChange={(e) => setFrameTextColor(e.target.value)}
                        className="color-picker-input"
                      />
                      <label className="color-picker-label">Frame Text</label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {qrNoteText && (
              <div className={`status-msg ${qrNoteClass.includes('warn') ? 'status-msg-error' : 'status-msg-success'}`} style={{ fontSize: '0.8rem', marginTop: '12px' }}>
                {qrNoteClass.includes('warn') ? <AlertTriangle size={16} /> : <Check size={16} />}
                <span>{qrNoteText}</span>
              </div>
            )}
          </section>

          {/* Card 3: Price Settings */}
          <section className="glass-panel card-content">
            <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
              3. Smart Keychain Pricing
            </h2>
            <form onSubmit={handleSavePrices} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Personalised Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Personalised Tag Prices</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Original Price (₹)</label>
                    <input
                      type="number"
                      className="text-input"
                      required
                      value={personalisedOriginal}
                      onChange={(e) => setPersonalisedOriginal(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Discounted Price (₹)</label>
                    <input
                      type="number"
                      className="text-input"
                      required
                      value={personalisedDiscounted}
                      onChange={(e) => setPersonalisedDiscounted(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Classic Price */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Classic Tag Prices</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Original Price (₹)</label>
                    <input
                      type="number"
                      className="text-input"
                      required
                      value={classicOriginal}
                      onChange={(e) => setClassicOriginal(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.7rem' }}>Discounted Price (₹)</label>
                    <input
                      type="number"
                      className="text-input"
                      required
                      value={classicDiscounted}
                      onChange={(e) => setClassicDiscounted(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {pricingSuccess && (
                <div className="status-msg status-msg-success" style={{ margin: 0, fontSize: '0.8rem' }}>
                  <CheckCircle2 size={16} />
                  <span>{pricingSuccess}</span>
                </div>
              )}

              {pricingError && (
                <div className="status-msg status-msg-error" style={{ margin: 0, fontSize: '0.8rem' }}>
                  <AlertTriangle size={16} />
                  <span>{pricingError}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingPrices}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {savingPrices ? "Saving..." : "Save Prices to Firestore"}
              </button>
            </form>
          </section>
        </div>

        {/* Right Column: Previews & Results */}
        <div className="sticky-column">

          {/* Card 1: Generated ID URL Link output */}
          <div className="glass-panel card-content">
            <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
              Generated Link Output
            </h2>
            {result ? (
              <div className="result-container" style={{ margin: 0 }}>
                <div className="result-header">
                  <span className="result-title">Customer Link</span>
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
                {result.isSavedToDb ? (
                  <p className="hint" style={{ color: 'var(--accent-emerald)', marginTop: '4px' }}>
                    ✓ ID stored in Firestore and loaded into the QR input.
                  </p>
                ) : (
                  <p className="hint" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    ID ready. Will be saved to Firestore when you Copy Link or Download PNG.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                <Globe size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem' }}>No customer link generated yet.</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click "Generate Customer Link" on the left.</p>
              </div>
            )}
          </div>

          {/* Card 2: Generated QR Code Image result */}
          <div className="glass-panel card-content">
            <h2 className="form-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '8px' }}>
              QR Code Preview
            </h2>
            {qrImageUrl ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={qrImageUrl}
                  alt="Resulting QR Code"
                  style={{
                    maxWidth: '100%',
                    borderRadius: '10px',
                    display: 'block',
                    margin: '12px auto',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleAppendToPdf}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Plus size={18} />
                    APPEND TO PDF SHEET
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      padding: '12px 16px'
                    }}
                  >
                    <Download size={16} />
                    DOWNLOAD SINGLE PNG
                  </button>
                </div>

                {downloadError && (
                  <p className="hint" style={{ color: 'var(--accent-rose)', marginTop: '8px' }}>{downloadError}</p>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
                <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem' }}>No QR Code generated yet.</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click "GENERATE QR CODE" on the left.</p>
              </div>
            )}
          </div>

          {/* Hidden Canvas used for generating the QR code */}
          <canvas ref={qrCanvasRef} style={{ display: 'none' }} />

        </div>

      </div>
      )}

      {/* ═══════════════════════════════════════════
          ORDERS TAB
      ═══════════════════════════════════════════ */}
      {activeAdminTab === 'orders' && (
        <div className="orders-tab-layout">

          {/* LEFT: Orders List */}
          <div className="orders-list-panel">
            <div className="orders-panel-header">
              <div>
                <h2 className="orders-panel-title">📦 Pending Orders</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {orders.length === 0 ? 'No new orders' : `${orders.length} order${orders.length > 1 ? 's' : ''} waiting to be processed`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleAppendAllToPdf}
                  disabled={orders.length === 0 || appendProgress.active}
                  className="btn btn-primary"
                  style={{
                    padding: '9px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    opacity: (orders.length === 0 || appendProgress.active) ? 0.5 : 1,
                    cursor: (orders.length === 0 || appendProgress.active) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {appendProgress.active ? (
                    <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Processing...</>
                  ) : (
                    <><Zap size={14} /> Append All to PDF</>
                  )}
                </button>
              </div>
            </div>

            {/* Progress Banner */}
            {(appendProgress.active || appendProgress.message) && (
              <div className="append-progress-banner">
                {appendProgress.active ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a5b4fc' }}>
                        {appendProgress.message}
                      </div>
                      {appendProgress.total > 0 && (
                        <div className="append-progress-bar-track">
                          <div
                            className="append-progress-bar-fill"
                            style={{ width: `${Math.round((appendProgress.done / appendProgress.total) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, flexShrink: 0 }}>
                      {appendProgress.done}/{appendProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#10b981' }}>{appendProgress.message}</span>
                  </>
                )}
              </div>
            )}

            {ordersError && (
              <div className="status-msg status-msg-error" style={{ marginBottom: '12px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{ordersError}</span>
              </div>
            )}

            {/* Orders Cards */}
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No pending orders</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>
                  New orders will appear here when customers place them.
                </p>
              </div>
            ) : (
              <div className="orders-cards-list">
                {orders.map((order, oIdx) => (
                  <div key={order.id} className="order-card">
                    {/* Order Header */}
                    <div className="order-card-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedOrders(prev => ({ ...prev, [order.id]: !prev[order.id] }))}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="order-card-name">{order.customerName || 'Unknown Customer'}</div>
                        <div className="order-card-meta">
                          <span><Phone size={11} /> {order.orderedPhoneNumber || '—'}</span>
                          <span><Mail size={11} /> {order.orderedEmail || '—'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className={`order-badge ${order.paymentMode === 'cod' ? 'badge-cod' : 'badge-online'}`}>
                            {order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>₹{order.totalAmount}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-toggle-order"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#10b981',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          {expandedOrders[order.id] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {expandedOrders[order.id] && (
                      <>
                        {/* Items */}
                        <div className="order-card-items">
                          {(order.items || []).map((item, iIdx) => (
                            <div key={iIdx} className="order-item-row">
                              {item.thumbnailUrl ? (
                                <img src={item.thumbnailUrl} alt={item.typeofqr} className="order-item-thumb" />
                              ) : (
                                <div className="order-item-thumb-placeholder">
                                  {item.typeofqr === 'classic_black' ? '⬛' : item.typeofqr === 'classic_white' ? '⬜' : '🎨'}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div className="order-item-type">
                                  {item.typeofqr === 'personalised' ? '🎨 Personalised' :
                                   item.typeofqr === 'classic_black' ? '⬛ Classic Black' : '⬜ Classic White'}
                                </div>
                                <div className="order-item-qty">Qty: <strong>{item.quantity}</strong> × ₹{item.unitPrice}</div>
                                {item.typeofqr === 'personalised' && item.imageUrl && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>✓ Image on Cloudinary</div>
                                )}
                              </div>
                              <div className="order-item-total">₹{(item.quantity * item.unitPrice)}</div>
                            </div>
                          ))}
                        </div>

                        {/* Shipping address */}
                        {order.shippingAddress && (
                          <div className="order-card-address">
                            📍 {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                          </div>
                        )}

                        {/* Total QR tags to generate for this order */}
                        <div className="order-card-footer">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Will generate <strong style={{ color: 'var(--accent-cyan)' }}>
                              {(order.items || []).reduce((s, i) => s + (i.quantity || 1), 0)}
                            </strong> QR tag{(order.items || []).reduce((s, i) => s + (i.quantity || 1), 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: PDF Preview (sticky) */}
          <div className="orders-pdf-panel">
            <div className="glass-panel card-content" style={{ position: 'sticky', top: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>PDF Sheet Preview</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {appendedQrs.length} tag{appendedQrs.length !== 1 ? 's' : ''} appended
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {appendedQrs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px' }}
                    >
                      <Download size={12} /> PDF ({appendedQrs.length})
                    </button>
                  )}
                </div>
              </div>

              {appendedQrs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-secondary)' }}>
                  <ImageIcon size={40} style={{ opacity: 0.2, marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem' }}>No QR codes yet.</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Press "Append All to PDF" to generate.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {(() => {
                    const pages = [];
                    for (let i = 0; i < appendedQrs.length; i += 16) {
                      pages.push(appendedQrs.slice(i, i + 16));
                    }
                    return pages.map((pageItems, pageIdx) => (
                      <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Page {pageIdx + 1} of {pages.length}
                        </span>
                        <div className="pdf-preview-page">
                          {Array.from({ length: 16 }).map((_, slotIdx) => {
                            const hasItem = slotIdx < pageItems.length;
                            if (hasItem) {
                              const slotEntry = pageItems[slotIdx];
                              const slotQrUrl = slotEntry?.qrUrl ?? slotEntry;
                              return (
                                <div key={slotIdx} className="pdf-preview-item">
                                  <img src={slotQrUrl} alt={`QR ${slotIdx}`} className="pdf-preview-image" />
                                  {renderGuideOverlay(pageIdx, slotIdx)}
                                </div>
                              );
                            } else {
                              return (
                                <div key={slotIdx} className="pdf-preview-item-empty" style={{ position: 'relative' }}>
                                  {renderGuideOverlay(pageIdx, slotIdx)}
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LANDING PAGE QRs TAB
      ═══════════════════════════════════════════ */}
      {activeAdminTab === 'landing_qrs' && (
        <div className="glass-panel card-content" style={{ marginTop: '12px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 40%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '20px' }}>
            🎨 Landing Page Keychains Configuration
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Configure the three hanging keychains that are displayed on the landing page of the website. 
            For each keychain, upload a background logo/picture, and enter a label. When saved, these will immediately update the homepage.
            Scanning these keychains or clicking them redirects users to the demo profile page (id=preview).
          </p>

          <form onSubmit={handleSaveLandingQrs} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              
              {/* Tag 1: Left Tag */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Left Tag (Tag 1)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setLandingQrs(prev => ({
                      ...prev,
                      tag1: { ...prev.tag1, visible: !prev.tag1.visible }
                    }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: landingQrs.tag1.visible ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      transition: 'all 0.2s'
                    }}
                    title={landingQrs.tag1.visible ? "Visible on landing page" : "Hidden on landing page"}
                  >
                    {landingQrs.tag1.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tag Label</label>
                  <input
                    type="text"
                    className="text-input"
                    value={landingQrs.tag1.label}
                    onChange={(e) => setLandingQrs(prev => ({
                      ...prev,
                      tag1: { ...prev.tag1, label: e.target.value }
                    }))}
                    placeholder="e.g. Your Pet"
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                      {landingQrs.tag1.base64Image ? (
                        <img src={landingQrs.tag1.base64Image} alt="Tag 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No image</div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="landing-tag1-file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleLandingImageUpload('tag1', e.target.files[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                      onClick={() => document.getElementById('landing-tag1-file').click()}
                    >
                      Upload Image
                    </button>
                  </div>
                </div>

                {/* Cropper Workspace for Tag 1 */}
                {croppingLandingTag === 'tag1' && cropState.showCropStep && (
                  <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>Adjust Crop Area</h4>
                    <div
                      style={{
                        position: 'relative',
                        margin: '10px auto',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: `${cropState.dispW}px`,
                        height: `${cropState.dispH}px`,
                        touchAction: 'none'
                      }}
                    >
                      <canvas ref={cropCanvasRef} style={{ display: 'block' }} />
                      <div
                        onPointerDown={handleCropBoxDown}
                        onPointerMove={handleCropBoxMove}
                        onPointerUp={handleCropBoxUp}
                        onPointerCancel={handleCropBoxUp}
                        style={{
                          position: 'absolute',
                          border: '1px solid rgba(255, 255, 255, 0.45)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          cursor: dragging ? 'grabbing' : 'grab',
                          borderRadius: '2px',
                          width: `${cropState.size}px`,
                          height: `${cropState.size}px`,
                          left: `${cropState.x}px`,
                          top: `${cropState.y}px`
                        }}
                      >
                        <div className="crop-box-overlay">
                          <div className="crop-grid-line-v v1" />
                          <div className="crop-grid-line-v v2" />
                          <div className="crop-grid-line-h h1" />
                          <div className="crop-grid-line-h h2" />
                          <div className="crop-edge-bar bar-top" />
                          <div className="crop-edge-bar bar-bottom" />
                          <div className="crop-edge-bar bar-left" />
                          <div className="crop-edge-bar bar-right" />
                          <div className="crop-corner-bracket corner-tl" />
                          <div className="crop-corner-bracket corner-tr" />
                          <div className="crop-corner-bracket corner-bl" />
                          <div className="crop-corner-bracket corner-br" />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Selection crop size:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max={Math.min(cropState.dispW, cropState.dispH)}
                        value={cropState.size}
                        onChange={handleCropSizeChange}
                        style={{ width: '100%', accentColor: '#e8402c' }}
                      />
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => handleApplyLandingCrop('tag1')}
                      >
                        Apply Crop
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setCroppingLandingTag(null);
                          setLandingCropImage(null);
                          setCropState(prev => ({ ...prev, showCropStep: false }));
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Tag Preview:</span>
                      <canvas ref={landingPreviewCanvasRef} style={{ display: 'block', width: '160px', height: '175px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#000' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tag 2: Center Tag */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Center Tag (Tag 2)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setLandingQrs(prev => ({
                      ...prev,
                      tag2: { ...prev.tag2, visible: !prev.tag2.visible }
                    }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: landingQrs.tag2.visible ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      transition: 'all 0.2s'
                    }}
                    title={landingQrs.tag2.visible ? "Visible on landing page" : "Hidden on landing page"}
                  >
                    {landingQrs.tag2.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tag Label</label>
                  <input
                    type="text"
                    className="text-input"
                    value={landingQrs.tag2.label}
                    onChange={(e) => setLandingQrs(prev => ({
                      ...prev,
                      tag2: { ...prev.tag2, label: e.target.value }
                    }))}
                    placeholder="e.g. Your Memory"
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                      {landingQrs.tag2.base64Image ? (
                        <img src={landingQrs.tag2.base64Image} alt="Tag 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No image</div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="landing-tag2-file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleLandingImageUpload('tag2', e.target.files[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                      onClick={() => document.getElementById('landing-tag2-file').click()}
                    >
                      Upload Image
                    </button>
                  </div>
                </div>

                {/* Cropper Workspace for Tag 2 */}
                {croppingLandingTag === 'tag2' && cropState.showCropStep && (
                  <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>Adjust Crop Area</h4>
                    <div
                      style={{
                        position: 'relative',
                        margin: '10px auto',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: `${cropState.dispW}px`,
                        height: `${cropState.dispH}px`,
                        touchAction: 'none'
                      }}
                    >
                      <canvas ref={cropCanvasRef} style={{ display: 'block' }} />
                      <div
                        onPointerDown={handleCropBoxDown}
                        onPointerMove={handleCropBoxMove}
                        onPointerUp={handleCropBoxUp}
                        onPointerCancel={handleCropBoxUp}
                        style={{
                          position: 'absolute',
                          border: '1px solid rgba(255, 255, 255, 0.45)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          cursor: dragging ? 'grabbing' : 'grab',
                          borderRadius: '2px',
                          width: `${cropState.size}px`,
                          height: `${cropState.size}px`,
                          left: `${cropState.x}px`,
                          top: `${cropState.y}px`
                        }}
                      >
                        <div className="crop-box-overlay">
                          <div className="crop-grid-line-v v1" />
                          <div className="crop-grid-line-v v2" />
                          <div className="crop-grid-line-h h1" />
                          <div className="crop-grid-line-h h2" />
                          <div className="crop-edge-bar bar-top" />
                          <div className="crop-edge-bar bar-bottom" />
                          <div className="crop-edge-bar bar-left" />
                          <div className="crop-edge-bar bar-right" />
                          <div className="crop-corner-bracket corner-tl" />
                          <div className="crop-corner-bracket corner-tr" />
                          <div className="crop-corner-bracket corner-bl" />
                          <div className="crop-corner-bracket corner-br" />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Selection crop size:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max={Math.min(cropState.dispW, cropState.dispH)}
                        value={cropState.size}
                        onChange={handleCropSizeChange}
                        style={{ width: '100%', accentColor: '#e8402c' }}
                      />
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => handleApplyLandingCrop('tag2')}
                      >
                        Apply Crop
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setCroppingLandingTag(null);
                          setLandingCropImage(null);
                          setCropState(prev => ({ ...prev, showCropStep: false }));
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Tag Preview:</span>
                      <canvas ref={landingPreviewCanvasRef} style={{ display: 'block', width: '160px', height: '175px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#000' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Tag 3: Right Tag */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    Right Tag (Tag 3)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setLandingQrs(prev => ({
                      ...prev,
                      tag3: { ...prev.tag3, visible: !prev.tag3.visible }
                    }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: landingQrs.tag3.visible ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      transition: 'all 0.2s'
                    }}
                    title={landingQrs.tag3.visible ? "Visible on landing page" : "Hidden on landing page"}
                  >
                    {landingQrs.tag3.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tag Label</label>
                  <input
                    type="text"
                    className="text-input"
                    value={landingQrs.tag3.label}
                    onChange={(e) => setLandingQrs(prev => ({
                      ...prev,
                      tag3: { ...prev.tag3, label: e.target.value }
                    }))}
                    placeholder="e.g. Your Art"
                    required
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Background Image</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', background: '#0a0a0a', border: '1px solid var(--border-light)', flexShrink: 0 }}>
                      {landingQrs.tag3.base64Image ? (
                        <img src={landingQrs.tag3.base64Image} alt="Tag 3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No image</div>
                      )}
                    </div>
                    <input
                      type="file"
                      id="landing-tag3-file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleLandingImageUpload('tag3', e.target.files[0])}
                    />
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
                      onClick={() => document.getElementById('landing-tag3-file').click()}
                    >
                      Upload Image
                    </button>
                  </div>
                </div>

                {/* Cropper Workspace for Tag 3 */}
                {croppingLandingTag === 'tag3' && cropState.showCropStep && (
                  <div className="confirmation-box" style={{ margin: '10px 0', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>Adjust Crop Area</h4>
                    <div
                      style={{
                        position: 'relative',
                        margin: '10px auto',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: `${cropState.dispW}px`,
                        height: `${cropState.dispH}px`,
                        touchAction: 'none'
                      }}
                    >
                      <canvas ref={cropCanvasRef} style={{ display: 'block' }} />
                      <div
                        onPointerDown={handleCropBoxDown}
                        onPointerMove={handleCropBoxMove}
                        onPointerUp={handleCropBoxUp}
                        onPointerCancel={handleCropBoxUp}
                        style={{
                          position: 'absolute',
                          border: '1px solid rgba(255, 255, 255, 0.45)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          cursor: dragging ? 'grabbing' : 'grab',
                          borderRadius: '2px',
                          width: `${cropState.size}px`,
                          height: `${cropState.size}px`,
                          left: `${cropState.x}px`,
                          top: `${cropState.y}px`
                        }}
                      >
                        <div className="crop-box-overlay">
                          <div className="crop-grid-line-v v1" />
                          <div className="crop-grid-line-v v2" />
                          <div className="crop-grid-line-h h1" />
                          <div className="crop-grid-line-h h2" />
                          <div className="crop-edge-bar bar-top" />
                          <div className="crop-edge-bar bar-bottom" />
                          <div className="crop-edge-bar bar-left" />
                          <div className="crop-edge-bar bar-right" />
                          <div className="crop-corner-bracket corner-tl" />
                          <div className="crop-corner-bracket corner-tr" />
                          <div className="crop-corner-bracket corner-bl" />
                          <div className="crop-corner-bracket corner-br" />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '10px' }}>
                      <label className="form-label" style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Selection crop size:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>{cropState.size}px</span>
                      </label>
                      <input
                        type="range"
                        min="30"
                        max={Math.min(cropState.dispW, cropState.dispH)}
                        value={cropState.size}
                        onChange={handleCropSizeChange}
                        style={{ width: '100%', accentColor: '#e8402c' }}
                      />
                    </div>

                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => handleApplyLandingCrop('tag3')}
                      >
                        Apply Crop
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-outline"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setCroppingLandingTag(null);
                          setLandingCropImage(null);
                          setCropState(prev => ({ ...prev, showCropStep: false }));
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Live Tag Preview:</span>
                      <canvas ref={landingPreviewCanvasRef} style={{ display: 'block', width: '160px', height: '175px', borderRadius: '8px', border: '1px solid var(--border-light)', background: '#000' }} />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Save Status messages */}
            {landingSuccess && (
              <div className="status-msg status-msg-success" style={{ margin: 0 }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{landingSuccess}</span>
              </div>
            )}
            {landingError && (
              <div className="status-msg status-msg-error" style={{ margin: 0 }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{landingError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingLandingQrs}
              style={{ padding: '14px 24px', fontSize: '0.95rem', fontWeight: 800, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {savingLandingQrs ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  Saving Keychains...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Save Landing Page QRs
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* PDF Print Sheet Preview Section */}
      <div className="glass-panel card-content" style={{ marginTop: '32px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 40%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              PDF Print Sheet Preview
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              Layout: A4 sheet, 4x4 grid (16 tags max per page). Each tag: 45mm x 60mm border, 40mm x 55mm QR code centered (2.5mm margin).
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {appendedQrs.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 700 }}
              >
                <Download size={14} />
                DOWNLOAD PDF ({appendedQrs.length} {appendedQrs.length === 1 ? 'Tag' : 'Tags'})
              </button>
            )}
          </div>
        </div>

        {appendedQrs.length === 0 ? (
          <div style={{
            border: '2px dashed var(--border-light)',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '6px' }}>Print Sheet is Empty</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
              Generate a QR code above and click **"APPEND TO PDF SHEET"** to place it on the print template.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            gap: '32px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '16px 0'
          }}>
            {/* Split appended QRs into chunks of 16 for pagination */}
            {(() => {
              const pages = [];
              for (let i = 0; i < appendedQrs.length; i += 16) {
                pages.push(appendedQrs.slice(i, i + 16));
              }
              return pages.map((pageItems, pageIdx) => (
                <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Page {pageIdx + 1} of {pages.length}
                  </span>
                  <div className="pdf-preview-page">
                    {Array.from({ length: 16 }).map((_, slotIdx) => {
                      const hasItem = slotIdx < pageItems.length;
                      if (hasItem) {
                        const slotEntry = pageItems[slotIdx];
                        const slotQrUrl = slotEntry?.qrUrl ?? slotEntry;
                        return (
                          <div key={slotIdx} className="pdf-preview-item">
                            <img
                              src={slotQrUrl}
                              alt={`QR Slot ${slotIdx}`}
                              className="pdf-preview-image"
                            />
                            {renderGuideOverlay(pageIdx, slotIdx)}
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={slotIdx}
                            className="pdf-preview-item-empty"
                            style={{ position: 'relative' }}
                          >
                            {renderGuideOverlay(pageIdx, slotIdx)}
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Logo Download Prompt Overlay Modal */}
      {showLogoDownloadPrompt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏷️</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Download Back-side Logos?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '20px' }}>
              Your front-side QR codes PDF has been downloaded. Would you like to download the matching back-side brand logos PDF with the same dimensions?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoDownloadPrompt(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                No, thanks
              </button>
              <button
                type="button"
                onClick={handleDownloadLogoPdf}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
              >
                Download Logo PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
