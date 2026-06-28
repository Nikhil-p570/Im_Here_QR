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
  EyeOff,
  Truck
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
  const [selectedVersion, setSelectedVersion] = useState(1);
  const [flipPreview, setFlipPreview] = useState(false);


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
  const [ordersSubTab, setOrdersSubTab] = useState('pending_qr'); // 'pending_qr' | 'to_ship'
  const [selectedToShipOrders, setSelectedToShipOrders] = useState({}); // { [orderId]: boolean }
  const [shipmentActionProgress, setShipmentActionProgress] = useState({ active: false, message: '' });
  const [nimbusWallet, setNimbusWallet] = useState(null);
  const [shippingRates, setShippingRates] = useState({});
  const [ratesLoading, setRatesLoading] = useState(false);
  const [fetchingWallet, setFetchingWallet] = useState(false);

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
  const [frontPreviewOpen, setFrontPreviewOpen] = useState(true);
  const [backPreviewOpen, setBackPreviewOpen] = useState(true);
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
  const [logoIconImage, setLogoIconImage] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/full logo black.png';
    img.onload = () => setLogoImage(img);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = '/logo icon black.png';
    img.onload = () => setLogoIconImage(img);
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

  const getBacksidePreviewUrl = () => {
    if (uploadedImg && selectedVersion === 2) {
      const logoCanvas = getLogoCanvas();
      if (logoCanvas) {
        return logoCanvas.toDataURL('image/jpeg', 0.95);
      }
    }
    return '/full logo black.png';
  };

  async function handleGenerateQR(urlOverride, makeTransparent = false) {
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
    if (makeTransparent) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    let bgImageMissing = false;
    if (bgMode === 'image' && !makeTransparent) {
      if (selectedVersion === 2) {
        if (logoIconImage) {
          ctx.drawImage(logoIconImage, 0, 35, canvas.width, canvas.height);
          if (overlayDarkness > 0) {
            ctx.fillStyle = `rgba(0,0,0,${overlayDarkness / 100})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        } else {
          bgImageMissing = true;
        }
      } else {
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
    }

    // Set shadow for dots to guarantee scan contrast on light background images
    if (bgMode === 'image' && !makeTransparent) {
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
    selectedVersion,
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

  // Real-time listener for active orders
  useEffect(() => {
    if (!firestoreDb || activeAdminTab !== 'orders') return;
    setOrdersLoading(true);
    setOrdersError('');
    
    // Fetch all active orders (filtering out delivered status)
    const q = query(
      collection(firestoreDb, 'orders'),
      where('orderStatus', '!=', 'delivered')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by createdAt descending in memory (avoids requiring a complex composite index)
      docs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setOrders(docs);
      setOrdersLoading(false);
    }, (err) => {
      console.error('Orders listener error:', err);
      // Fallback: fetch without where clause if security rules or indexing has issues
      const fallbackQuery = query(collection(firestoreDb, 'orders'));
      const fallbackUnsubscribe = onSnapshot(fallbackQuery, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filter in memory
        const activeDocs = docs.filter(doc => doc.orderStatus !== 'delivered');
        activeDocs.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setOrders(activeDocs);
        setOrdersLoading(false);
      }, (fallbackErr) => {
        setOrdersError('Failed to load orders: ' + fallbackErr.message);
        setOrdersLoading(false);
      });
    });
    return () => unsubscribe();
  }, [firestoreDb, activeAdminTab]);

  const fetchWalletBalance = async () => {
    setFetchingWallet(true);
    try {
      const res = await handleCallNimbusApi('wallet_balance', {});
      if (res.success) {
        setNimbusWallet(res.walletBalance);
      }
    } catch (err) {
      console.warn("Failed to fetch Nimbus wallet:", err);
    } finally {
      setFetchingWallet(false);
    }
  };

  const calculatePendingRates = async (pendingOrdersList) => {
    setRatesLoading(true);
    const newRates = { ...shippingRates };
    let hasChanges = false;
    for (const order of pendingOrdersList) {
      if (!newRates[order.id] && order.shippingAddress?.pincode) {
        try {
          const totalQty = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
          const res = await handleCallNimbusApi('calculate_rates', {
            destinationPincode: order.shippingAddress.pincode,
            totalAmount: order.totalAmount,
            totalQty: totalQty,
            paymentMode: order.paymentMode
          });
          if (res.success && res.cheapest) {
            newRates[order.id] = {
              courierId: res.cheapest.courierId,
              name: res.cheapest.name,
              charges: res.cheapest.charges
            };
            hasChanges = true;
          }
        } catch (err) {
          console.warn(`Failed to calculate rate for order ${order.id}:`, err);
        }
      }
    }
    if (hasChanges) {
      setShippingRates(newRates);
    }
    setRatesLoading(false);
  };

  useEffect(() => {
    if (activeAdminTab === 'orders' && ordersSubTab === 'to_ship') {
      fetchWalletBalance();
      const pendingShipmentOrders = orders.filter(o => o.orderStatus === 'appended');
      if (pendingShipmentOrders.length > 0) {
        calculatePendingRates(pendingShipmentOrders);
      }
    }
  }, [activeAdminTab, ordersSubTab, orders.length]);

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
  const loadLogoCanvas = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const out = document.createElement('canvas');
        out.width = 320;
        out.height = 320;
        try {
          out.getContext('2d').drawImage(img, 0, 0, 320, 320);
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
  const generateQrDataUrlForOrder = async (url, typeofqr, logoCanvas, version = 1) => {
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

    // Make background transparent for clean layering in PDF
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
    const pendingOrders = orders.filter(o => o.orderStatus === 'orderplaced');
    if (pendingOrders.length === 0 || appendProgress.active) return;

    const totalQrs = pendingOrders.reduce((sum, order) =>
      sum + (order.items || []).reduce((s, item) => s + (item.quantity || 1), 0), 0
    );

    if (totalQrs === 0) return;

    setAppendProgress({ active: true, total: totalQrs, done: 0, message: 'Starting up...' });

    const newEntries = [];
    let done = 0;

    try {
      for (const order of pendingOrders) {
        for (const item of (order.items || [])) {
          let logoCanvas = null;

          // Load customer image for personalised QR (fallback to tempBase64Image if not yet uploaded to Cloudinary)
          if (item.typeofqr === 'personalised' && (item.imageUrl || item.tempBase64Image)) {
            setAppendProgress(prev => ({ ...prev, message: `Loading personalised image...` }));
            logoCanvas = await loadLogoCanvas(
              item.imageUrl || item.tempBase64Image
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
            const qrDataUrl = await generateQrDataUrlForOrder(url, item.typeofqr, logoCanvas, item.version || 1);

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

            newEntries.push({
              qrUrl: qrDataUrl,
              id: newId,
              orderedPhoneNumber: order.orderedPhoneNumber,
              version: item.version || 1,
              imageUrl: item.imageUrl || item.tempBase64Image || '',
              srcCropX: item.srcCropX || 0,
              srcCropY: item.srcCropY || 0,
              srcCropSize: item.srcCropSize || 320,
              typeofqr: item.typeofqr || 'classic_black'
            });
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

  // ── NimbusPost Helper Function ──
  const handleCallNimbusApi = async (action, payload) => {
    const res = await fetch('/api/nimbuspost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Failed to call Nimbus API (${action})`);
    }
    return data;
  };

  // ── Individual Booking Handler ──
  const handleBookShipment = async (order) => {
    setShipmentActionProgress({ active: true, message: `Booking shipment for order ${order.id}...` });
    setOrdersError("");
    try {
      const rate = shippingRates[order.id];
      const res = await handleCallNimbusApi('create_shipment', {
        orderNumber: order.id,
        customerName: order.customerName,
        orderedPhoneNumber: order.orderedPhoneNumber,
        orderedEmail: order.orderedEmail,
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        shippingAddress: order.shippingAddress,
        items: order.items,
        courierId: rate ? rate.courierId : '244'
      });

      await updateDoc(doc(firestoreDb, 'orders', order.id), {
        orderStatus: 'shipment_created',
        nimbuspostOrderId: res.data.orderId || null,
        shipmentId: res.data.shipmentId || null,
        awbNumber: res.data.awbNumber || null,
        courierPartner: res.data.courierName || null,
        shippingLabelUrl: res.data.labelUrl || null,
        shipmentCreatedAt: new Date()
      });

      setShipmentActionProgress({ active: false, message: `Successfully created shipment! AWB: ${res.data.awbNumber}` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Booking failed: ${err.message}`);
    }
  };

  // ── Bulk Booking Handler ──
  const handleBulkBookShipments = async () => {
    const selectedIds = Object.keys(selectedToShipOrders).filter(id => selectedToShipOrders[id]);
    if (selectedIds.length === 0) return;

    setShipmentActionProgress({ active: true, message: `Booking ${selectedIds.length} shipments...` });
    setOrdersError("");
    let completed = 0;

    try {
      const toShipOrdersList = orders.filter(o => ['appended', 'QR_READY'].includes(o.orderStatus) && selectedIds.includes(o.id));
      for (const order of toShipOrdersList) {
        setShipmentActionProgress({ active: true, message: `Booking ${completed + 1} of ${toShipOrdersList.length}: ${order.customerName}...` });
        
        const rate = shippingRates[order.id];
        const res = await handleCallNimbusApi('create_shipment', {
          orderNumber: order.id,
          customerName: order.customerName,
          orderedPhoneNumber: order.orderedPhoneNumber,
          orderedEmail: order.orderedEmail,
          totalAmount: order.totalAmount,
          paymentMode: order.paymentMode,
          shippingAddress: order.shippingAddress,
          items: order.items,
          courierId: rate ? rate.courierId : '244'
        });

        await updateDoc(doc(firestoreDb, 'orders', order.id), {
          orderStatus: 'shipment_created',
          nimbuspostOrderId: res.data.orderId || null,
          shipmentId: res.data.shipmentId || null,
          awbNumber: res.data.awbNumber || null,
          courierPartner: res.data.courierName || null,
          shippingLabelUrl: res.data.labelUrl || null,
          shipmentCreatedAt: new Date()
        });

        completed++;
      }
      setSelectedToShipOrders({});
      setShipmentActionProgress({ active: false, message: `Successfully booked ${completed} shipments!` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Bulk booking failed: ${err.message}`);
    }
  };

  // ── Bulk Mark as Shipped ──
  const handleMarkAllShipped = async () => {
    const movedOrders = orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled'].includes(o.orderStatus));
    if (movedOrders.length === 0) return;

    if (!window.confirm(`Are you sure you want to mark all ${movedOrders.length} moved shipments as Shipped?`)) return;

    setShipmentActionProgress({ active: true, message: `Marking ${movedOrders.length} orders as shipped...` });
    try {
      let count = 0;
      for (const order of movedOrders) {
        await updateDoc(doc(firestoreDb, 'orders', order.id), {
          orderStatus: 'shipped',
          shippedAt: new Date()
        });
        count++;
      }
      setShipmentActionProgress({ active: false, message: `Successfully marked ${count} orders as Shipped!` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Failed to update status: ${err.message}`);
    }
  };

  const handleMarkSelectedShipped = async () => {
    const selectedIds = Object.keys(selectedToShipOrders).filter(id => selectedToShipOrders[id]);
    if (selectedIds.length === 0) return;

    if (!window.confirm(`Mark ${selectedIds.length} selected orders as Shipped?`)) return;

    setShipmentActionProgress({ active: true, message: `Marking ${selectedIds.length} selected orders as shipped...` });
    try {
      const selectedOrdersList = orders.filter(o => selectedIds.includes(o.id));
      let count = 0;
      for (const order of selectedOrdersList) {
        await updateDoc(doc(firestoreDb, 'orders', order.id), {
          orderStatus: 'shipped',
          shippedAt: new Date()
        });
        count++;
      }
      setSelectedToShipOrders({});
      setShipmentActionProgress({ active: false, message: `Successfully marked ${count} orders as Shipped!` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Failed to update status: ${err.message}`);
    }
  };

  // ── Cancel Shipment Handler ──
  const handleCancelShipment = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel the shipment for AWB: ${order.awbNumber}?`)) return;

    setShipmentActionProgress({ active: true, message: `Cancelling shipment...` });
    setOrdersError("");
    try {
      await handleCallNimbusApi('cancel_shipment', {
        awbNumber: order.awbNumber
      });

      await updateDoc(doc(firestoreDb, 'orders', order.id), {
        orderStatus: 'appended', // Reset to appended (QR Ready)
        nimbuspostOrderId: null,
        shipmentId: null,
        awbNumber: null,
        courierPartner: null,
        shippingLabelUrl: null,
        shipmentCreatedAt: null
      });

      setShipmentActionProgress({ active: false, message: `Shipment cancelled and refunded successfully!` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Cancellation failed: ${err.message}`);
    }
  };

  // ── Bulk Mark as Packed ──
  const handleBulkMarkAsPacked = async () => {
    const selectedIds = Object.keys(selectedToShipOrders).filter(id => selectedToShipOrders[id]);
    if (selectedIds.length === 0) return;

    setShipmentActionProgress({ active: true, message: `Marking as PACKED...` });
    setOrdersError("");
    let count = 0;
    try {
      for (const id of selectedIds) {
        const order = orders.find(o => o.id === id);
        if (order && (order.orderStatus === 'shipment_created' || order.orderStatus === 'label_printed')) {
          await updateDoc(doc(firestoreDb, 'orders', order.id), {
            orderStatus: 'packed'
          });
          count++;
        }
      }
      setSelectedToShipOrders({});
      setShipmentActionProgress({ active: false, message: `Successfully marked ${count} orders as packed!` });
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Packing update failed: ${err.message}`);
    }
  };

  // ── Bulk Schedule Pickup (Manifest) ──
  const handleBulkSchedulePickup = async () => {
    const selectedIds = Object.keys(selectedToShipOrders).filter(id => selectedToShipOrders[id]);
    if (selectedIds.length === 0) return;

    const awbNumbers = selectedIds
      .map(id => orders.find(o => o.id === id))
      .filter(o => o && o.orderStatus === 'packed' && o.awbNumber)
      .map(o => o.awbNumber);

    if (awbNumbers.length === 0) {
      alert("Please select packed orders with generated AWBs to schedule pickup.");
      return;
    }

    setShipmentActionProgress({ active: true, message: `Scheduling pickup & creating manifest for ${awbNumbers.length} packages...` });
    setOrdersError("");
    try {
      const res = await handleCallNimbusApi('manifest', { awbNumbers });

      // Update all selected orders to pickup_scheduled and store the manifest URL
      for (const id of selectedIds) {
        const order = orders.find(o => o.id === id);
        if (order && order.orderStatus === 'packed') {
          await updateDoc(doc(firestoreDb, 'orders', order.id), {
            orderStatus: 'pickup_scheduled',
            manifestUrl: res.manifestUrl
          });
        }
      }

      setSelectedToShipOrders({});
      setShipmentActionProgress({ active: false, message: `Pickup scheduled successfully!` });
      if (res.manifestUrl) {
        window.open(res.manifestUrl, '_blank');
      }
      setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
    } catch (err) {
      console.error(err);
      setShipmentActionProgress({ active: false, message: '' });
      setOrdersError(`Pickup scheduling failed: ${err.message}`);
    }
  };

  const handleAppendToPdf = async () => {
    if (!qrImageUrl) {
      setDownloadError("Please generate a QR code first.");
      return;
    }

    // Check if duplicate QR is already appended
    const isDuplicate = appendedQrs.some(e => 
      (result?.id && e?.id === result.id) || (qrUrl.trim() && e?.destUrl === qrUrl.trim())
    );

    if (isDuplicate) {
      const confirmAppend = window.confirm("This same QR code is already appended to the sheet. Do you want to add it again for sure?");
      if (!confirmAppend) {
        return;
      }
    }

    // 1. Temporarily generate a transparent version of the QR code
    await handleGenerateQR(qrUrl.trim(), true);
    const transparentQrUrl = qrCanvasRef.current ? qrCanvasRef.current.toDataURL('image/png') : qrImageUrl;

    // 2. Restore the original QR code with background for screen preview
    await handleGenerateQR(qrUrl.trim(), false);

    const logoCanvas = getLogoCanvas();
    const entry = {
      qrUrl: transparentQrUrl, // Store transparent version in the PDF entry!
      destUrl: qrUrl.trim(),
      id: result?.id || null,
      typeofqr: uploadedImg ? 'personalised' : (bgColor === '#ffffff' ? 'classic_white' : 'classic_black'),
      version: selectedVersion,
      imageUrl: logoCanvas ? logoCanvas.toDataURL('image/jpeg', 0.9) : '',
      srcCropX: cropState.x,
      srcCropY: cropState.y,
      srcCropSize: cropState.size,
      isManual: true
    };
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
        status: 'unregistered',
        typeofqr: nextItem.typeofqr || 'classic_black',
        version: nextItem.version || 1
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

    const itemsPerPage = 12;
    const colWidth = 57;
    const rowHeight = 57;
    const marginX = 17.5;
    const marginY = 28.5;
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

      const row = Math.floor(pageIndex / 3);
      const col = pageIndex % 3;

      const x = marginX + col * (colWidth + gapX);
      const y = marginY + row * (rowHeight + gapY);

      // 1. Draw outer grey border (57mm x 57mm)
      pdf.setDrawColor(209, 213, 219); // light grey (#d1d5db)
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, colWidth, rowHeight);

      // 2. Draw background first (52mm x 52mm) to serve as bleed margin
      if (entry?.typeofqr === 'personalised') {
        if (entry?.version === 2) {
          // Version 2 (Logo Edition) frontside background is the logo icon
          if (logoIconImage) {
            pdf.addImage(logoIconImage, "PNG", x + 2.5, y + 2.5, 52, 52);
          } else {
            pdf.addImage("/logo icon black.png", "PNG", x + 2.5, y + 2.5, 52, 52);
          }
        } else {
          // Version 1 (Custom Image) frontside background is the custom cropped image
          if (entry.imageUrl) {
            pdf.addImage(entry.imageUrl, "JPEG", x + 2.5, y + 2.5, 52, 52);
          }
        }
      } else if (entry?.typeofqr === 'classic_black') {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(x + 2.5, y + 2.5, 52, 52, "F");
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x + 2.5, y + 2.5, 52, 52, "F");
      }

      // 3. Add QR image centered (49mm x 49mm), leaving 1.5mm horizontal & 1.5mm vertical margin inside the 52x52 inner area
      pdf.addImage(qrUrl, "PNG", x + 4.0, y + 4.0, 49, 49);

    });

    pdf.save("qr-print-sheet.pdf");
  };

  const handleDownloadLogoPdf = async () => {
    if (appendedQrs.length === 0) return;

    setShipmentActionProgress({ active: true, message: "Preparing backside print sheet..." });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const itemsPerPage = 12;
    const colWidth = 57;
    const rowHeight = 57;
    const marginX = 17.5;
    const marginY = 28.5;
    const gapX = 2;
    const gapY = 4;

    for (let index = 0; index < appendedQrs.length; index++) {
      const entry = appendedQrs[index];
      const pageIndex = index % itemsPerPage;

      if (index > 0 && pageIndex === 0) {
        pdf.addPage();
      }

      const row = Math.floor(pageIndex / 3);
      const col = pageIndex % 3;

      const x = marginX + col * (colWidth + gapX);
      const y = marginY + row * (rowHeight + gapY);

      // 1. Add appropriate backside cover (fills the entire 52x52 box for sublimation bleed)
      if (entry.typeofqr === 'personalised' && entry.version === 2) {
        if (entry.imageUrl) {
          const customCanvas = await loadLogoCanvas(
            entry.imageUrl
          );
          if (customCanvas) {
            pdf.addImage(customCanvas.toDataURL('image/jpeg', 0.95), "JPEG", x + 2.5, y + 2.5, 52, 52);
          } else {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(8);
            pdf.text("Image Load Failed", x + colWidth / 2, y + rowHeight / 2, { align: "center" });
          }
        } else {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text("No Image", x + colWidth / 2, y + rowHeight / 2, { align: "center" });
        }
      } else {
        if (logoImage) {
          pdf.addImage(logoImage, "PNG", x + 2.5, y + 2.5, 52, 52);
        } else {
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.text("I'm Here Logo", x + colWidth / 2, y + rowHeight / 2, { align: "center" });
        }
      }

      // 2. Draw outer grey border (57mm x 57mm) on top of the image
      pdf.setDrawColor(209, 213, 219);
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, colWidth, rowHeight);

    }

    pdf.save("logo-print-sheet.pdf");
    setShipmentActionProgress({ active: false, message: "" });
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
        status: 'unregistered',
        typeofqr: uploadedImg ? 'personalised' : (bgColor === '#ffffff' ? 'classic_white' : 'classic_black'),
        version: selectedVersion
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

  // Action: Clear Orders
  const handleClearOrders = async () => {
    if (!firestoreDb) return;
    const confirmClear = window.confirm("Are you sure you want to delete all active and mock orders from the database?");
    if (!confirmClear) return;
    
    setLoading(true);
    setAdminError("");
    setAdminSuccess("");
    try {
      const querySnapshot = await getDocs(collection(firestoreDb, 'orders'));
      if (querySnapshot.empty) {
        setAdminSuccess("Orders database is already empty!");
        return;
      }
      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      setAdminSuccess("All orders deleted successfully!");
    } catch (err) {
      console.error(err);
      setAdminError(`Failed to clear orders: ${err.message}.`);
    } finally {
      setLoading(false);
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
    const initSize = Math.round(Math.min(dispW, dispH) * 1.0);

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
            <img src="/logo icon black.png" alt="I'm here" style={{ width: '50px', height: '50px', objectFit: 'contain', marginRight: '14px', borderRadius: '8px' }} />
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

          {/* Clear Orders Control */}
          <button
            type="button"
            className="btn btn-danger-outline"
            onClick={handleClearOrders}
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
            title="Clear Orders"
          >
            <Trash2 size={14} />
            Clear Orders
          </button>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Tag Style Version</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedVersion(1)}
                        className={`mode-btn ${selectedVersion === 1 ? 'active' : ''}`}
                        style={{ flex: 1, padding: '10px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                      >
                        <span style={{ fontWeight: 700 }}>Custom Image (V1)</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Front: Photo | Back: Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedVersion(2)}
                        className={`mode-btn ${selectedVersion === 2 ? 'active' : ''}`}
                        style={{ flex: 1, padding: '10px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                      >
                        <span style={{ fontWeight: 700 }}>Logo Edition (V2)</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Front: Logo | Back: Photo</span>
                      </button>
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
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
                  src={flipPreview ? getBacksidePreviewUrl() : qrImageUrl}
                  alt={flipPreview ? "Backside Preview" : "Resulting QR Code"}
                  style={{
                    width: '100%',
                    maxWidth: '380px',
                    aspectRatio: hasFrame ? '640/700' : '1/1',
                    objectFit: flipPreview ? 'contain' : 'cover',
                    background: flipPreview ? '#000000' : 'transparent',
                    borderRadius: '10px',
                    display: 'block',
                    margin: '12px auto',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                />

                <button
                  type="button"
                  className="btn"
                  onClick={() => setFlipPreview(prev => !prev)}
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
                    padding: '12px 16px',
                    marginBottom: '8px'
                  }}
                >
                  🔄 Flip Tag ({flipPreview ? 'See Front' : 'See Back'})
                </button>

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

                  {appendedQrs.length > 0 && appendedQrs[appendedQrs.length - 1]?.isManual && (
                    <button
                      type="button"
                      onClick={handleRemoveLastQr}
                      className="btn btn-danger-outline"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        borderColor: 'rgba(244, 63, 94, 0.4)',
                        color: 'var(--accent-rose)',
                        fontSize: '0.85rem',
                        padding: '12px 16px',
                        marginTop: '2px',
                        marginBottom: '2px'
                      }}
                    >
                      ↩️ UNDO LAST APPEND
                    </button>
                  )}

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
              {/* Sub-tab navigation inside Orders */}
              <div className="orders-subtabs-nav" style={{ display: 'flex', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <button
                  type="button"
                  className={`orders-subtab-btn ${ordersSubTab === 'pending_qr' ? 'active' : ''}`}
                  onClick={() => setOrdersSubTab('pending_qr')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: ordersSubTab === 'pending_qr' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderBottom: ordersSubTab === 'pending_qr' ? '2.5px solid var(--accent-indigo)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  📝 Pending QR Generation ({orders.filter(o => o.orderStatus === 'orderplaced').length})
                </button>
                <button
                  type="button"
                  className={`orders-subtab-btn ${ordersSubTab === 'to_ship' ? 'active' : ''}`}
                  onClick={() => setOrdersSubTab('to_ship')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: ordersSubTab === 'to_ship' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderBottom: ordersSubTab === 'to_ship' ? '2.5px solid var(--accent-indigo)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🚚 Orders to Ship ({orders.filter(o => o.orderStatus === 'appended').length})
                </button>
                <button
                  type="button"
                  className={`orders-subtab-btn ${ordersSubTab === 'moved_to_shipment' ? 'active' : ''}`}
                  onClick={() => setOrdersSubTab('moved_to_shipment')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: ordersSubTab === 'moved_to_shipment' ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    borderBottom: ordersSubTab === 'moved_to_shipment' ? '2.5px solid var(--accent-indigo)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  🚀 Moved to Shipment ({orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length})
                </button>
              </div>

            {/* Render subtabs */}
            {ordersSubTab === 'pending_qr' ? (
              <>
                <div className="orders-panel-header">
                  <div>
                    <h2 className="orders-panel-title">📦 Pending Orders</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {orders.filter(o => o.orderStatus === 'orderplaced').length === 0 ? 'No new orders' : `${orders.filter(o => o.orderStatus === 'orderplaced').length} order${orders.filter(o => o.orderStatus === 'orderplaced').length > 1 ? 's' : ''} waiting to be processed`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={handleAppendAllToPdf}
                      disabled={orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active}
                      className="btn btn-primary"
                      style={{
                        padding: '9px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        opacity: (orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active) ? 0.5 : 1,
                        cursor: (orders.filter(o => o.orderStatus === 'orderplaced').length === 0 || appendProgress.active) ? 'not-allowed' : 'pointer'
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
                  <div className="append-progress-banner" style={{ marginBottom: '12px' }}>
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

                {ordersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading orders...</p>
                  </div>
                ) : orders.filter(o => o.orderStatus === 'orderplaced').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No pending orders</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>
                      New orders will appear here when customers place them.
                    </p>
                  </div>
                ) : (
                  <div className="orders-cards-list">
                    {orders.filter(o => o.orderStatus === 'orderplaced').map((order) => (
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
                              style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', padding: '4px' }}
                            >
                              {expandedOrders[order.id] ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {expandedOrders[order.id] && (
                          <>
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
                                  </div>
                                  <div className="order-item-total">₹{(item.quantity * item.unitPrice)}</div>
                                </div>
                              ))}
                            </div>

                            {order.shippingAddress && (
                              <div className="order-card-address">
                                📍 {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : ordersSubTab === 'to_ship' ? (
              /* ORDERS TO SHIP TAB (NIMBUSPOST SHIPPING INTEGRATION) */
              <>
                <div className="orders-panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 className="orders-panel-title">🚚 Shipping Dashboard</h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Process shipments, print labels, and schedule courier pickups via NimbusPost
                      </p>
                    </div>
                  </div>

                  {/* Bulk Actions Bar */}
                  <div className="bulk-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                      <input
                        type="checkbox"
                        id="select-all-to-ship"
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        checked={
                          orders.filter(o => o.orderStatus === 'appended').length > 0 &&
                          orders.filter(o => o.orderStatus === 'appended').every(o => !!selectedToShipOrders[o.id])
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const toShipList = orders.filter(o => o.orderStatus === 'appended');
                          setSelectedToShipOrders(prev => {
                            const newSel = { ...prev };
                            toShipList.forEach(o => {
                              newSel[o.id] = checked;
                            });
                            return newSel;
                          });
                        }}
                      />
                      <label htmlFor="select-all-to-ship" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                        Select All ({orders.filter(o => o.orderStatus === 'appended').length})
                      </label>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>
                      Selected: {Object.values(selectedToShipOrders).filter(Boolean).length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBulkBookShipments}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      🚀 Add Selected to NimbusPost
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBulkMarkAsPacked}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      📦 Mark as Packed
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBulkSchedulePickup}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                      📅 Schedule Pickup
                    </button>
                  </div>
                </div>

                {/* Shipping Action Progress Banner */}
                {(shipmentActionProgress.active || shipmentActionProgress.message) && (
                  <div className="append-progress-banner" style={{ margin: '12px 0', background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    {shipmentActionProgress.active ? (
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', marginRight: '8px' }} />
                    ) : (
                      <CheckCircle2 size={16} style={{ color: '#10b981', marginRight: '8px' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: shipmentActionProgress.active ? '#a5b4fc' : '#10b981' }}>
                      {shipmentActionProgress.message}
                    </span>
                  </div>
                )}

                {/* NimbusPost Rates and Wallet Dashboard */}
                <div className="nimbus-rates-dashboard glass-panel" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={18} /> NimbusPost B2B Shipping Rates & Wallet
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Live Wallet Balance</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: nimbusWallet !== null && nimbusWallet < 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                        {fetchingWallet ? (
                          <span style={{ fontSize: '1.0rem', color: 'var(--text-secondary)' }}>Loading...</span>
                        ) : nimbusWallet !== null ? (
                          `₹${nimbusWallet.toFixed(2)}`
                        ) : (
                          '—'
                        )}
                      </div>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending Shipping Cost (Cheapest Courier)</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        ₹{Object.values(shippingRates).reduce((sum, r) => sum + r.charges, 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Required Refill</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                        ₹{Math.max(0, Object.values(shippingRates).reduce((sum, r) => sum + r.charges, 0) - (nimbusWallet || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Order ID</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Recipient</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Destination</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Cheapest Partner</th>
                          <th style={{ padding: '8px 12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Charges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.filter(o => o.orderStatus === 'appended').map(order => {
                          const rate = shippingRates[order.id];
                          return (
                            <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 700 }}>{order.id}</td>
                              <td style={{ padding: '8px 12px' }}>{order.customerName}</td>
                              <td style={{ padding: '8px 12px' }}>{order.shippingAddress?.city} ({order.shippingAddress?.pincode})</td>
                              <td style={{ padding: '8px 12px', color: '#a5b4fc', fontWeight: 600 }}>
                                {ratesLoading && !rate ? (
                                  <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Calculating...</span>
                                ) : rate ? (
                                  `${rate.name}`
                                ) : (
                                  'Not Calculated / Pincode Error'
                                )}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>
                                {rate ? `₹${rate.charges.toFixed(2)}` : '₹0.00'}
                              </td>
                            </tr>
                          );
                        })}
                        {orders.filter(o => o.orderStatus === 'appended').length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No pending orders ready for shipment.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {ordersError && (
                  <div className="status-msg status-msg-error" style={{ margin: '12px 0' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{ordersError}</span>
                  </div>
                )}

                {ordersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading shipments...</p>
                  </div>
                ) : orders.filter(o => o.orderStatus === 'appended').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No orders to ship</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>
                      Orders will appear here once their QR PDFs are generated.
                    </p>
                  </div>
                ) : (
                  <div className="orders-cards-list">
                    {orders.filter(o => o.orderStatus === 'appended').map((order) => {
                      const isSelected = !!selectedToShipOrders[order.id];
                      return (
                        <div key={order.id} className={`order-card shipping-order-card status-${order.orderStatus}`} style={{ borderLeft: isSelected ? '4px solid var(--accent-indigo)' : '4px solid transparent' }}>
                          
                          {/* Shipping Card Header */}
                          <div className="order-card-header" style={{ paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => setSelectedToShipOrders(prev => ({ ...prev, [order.id]: e.target.checked }))}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div>
                                <div className="order-card-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  {order.customerName || 'Unknown Customer'}
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({order.id})</span>
                                </div>
                                <div className="order-card-meta">
                                  <span>📞 {order.orderedPhoneNumber || '—'}</span>
                                  <span>✉️ {order.orderedEmail || '—'}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <span className={`shipping-status-badge badge-${order.orderStatus}`}>
                                {order.orderStatus === 'appended' && '📝 QR Ready'}
                                {order.orderStatus === 'shipment_created' && '🚚 Shipment Booked'}
                                {order.orderStatus === 'label_printed' && '🖨️ Label Printed'}
                                {order.orderStatus === 'packed' && '📦 Packed'}
                                {order.orderStatus === 'pickup_scheduled' && '📅 Pickup Scheduled'}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}
                              </span>
                            </div>
                          </div>

                          {/* Address & Products Details */}
                          <div style={{ fontSize: '0.82rem', padding: '12px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>📍 Shipping Address:</strong> {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - <strong>{order.shippingAddress?.pincode}</strong>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong>📦 Items ({order.items?.reduce((s, i) => s + (i.quantity || 1), 0)}):</strong>
                              {order.items?.map((item, idx) => (
                                <div key={idx} style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>
                                  • {item.typeofqr === 'personalised' ? 'Personalised Tag' : 'Classic Tag'} × {item.quantity}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipment details if created */}
                          {order.awbNumber && (
                            <div style={{ fontSize: '0.8rem', padding: '10px 12px', background: 'rgba(99,102,241,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', borderTop: '1px dashed rgba(99,102,241,0.15)' }}>
                              <div><strong>AWB:</strong> {order.awbNumber}</div>
                              <div><strong>Courier:</strong> {order.courierPartner || 'NimbusPost'}</div>
                              {order.nimbuspostOrderId && <div><strong>Nimbus ID:</strong> {order.nimbuspostOrderId}</div>}
                            </div>
                          )}

                          {order.orderStatus === 'appended' && shippingRates[order.id] && (
                            <div style={{ fontSize: '0.8rem', padding: '10px 12px', background: 'rgba(245,158,11,0.04)', display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                              <div><strong>Calculated Courier:</strong> {shippingRates[order.id].name}</div>
                              <div><strong>Rate:</strong> ₹{shippingRates[order.id].charges.toFixed(2)}</div>
                            </div>
                          )}

                          {/* Shipping Card Actions */}
                          <div className="order-card-actions" style={{ display: 'flex', padding: '12px', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                            {order.orderStatus === 'appended' && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleBookShipment(order)}
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                🚀 Create Nimbus Shipment
                              </button>
                            )}

                            {order.shippingLabelUrl && (
                              <a
                                href={order.shippingLabelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                                onClick={async () => {
                                  // Automatically advance status to label_printed if it's shipment_created
                                  if (order.orderStatus === 'shipment_created') {
                                    await updateDoc(doc(firestoreDb, 'orders', order.id), {
                                      orderStatus: 'label_printed'
                                    });
                                  }
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--accent-indigo)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={11} /> Download Shipping Label
                              </a>
                            )}

                            {(order.orderStatus === 'shipment_created' || order.orderStatus === 'label_printed') && (
                              <button
                                type="button"
                                className="btn"
                                onClick={async () => {
                                  await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'packed' });
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#10b981', border: 'none', color: '#ffffff' }}
                              >
                                ✓ Mark Packed
                              </button>
                            )}

                            {order.orderStatus === 'packed' && (
                              <button
                                type="button"
                                className="btn"
                                onClick={async () => {
                                  setShipmentActionProgress({ active: true, message: 'Scheduling pickup...' });
                                  try {
                                    const res = await handleCallNimbusApi('manifest', { awbNumbers: [order.awbNumber] });
                                    await updateDoc(doc(firestoreDb, 'orders', order.id), {
                                      orderStatus: 'pickup_scheduled',
                                      manifestUrl: res.manifestUrl
                                    });
                                    setShipmentActionProgress({ active: false, message: 'Pickup scheduled successfully!' });
                                    if (res.manifestUrl) window.open(res.manifestUrl, '_blank');
                                    setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
                                  } catch (err) {
                                    setShipmentActionProgress({ active: false, message: '' });
                                    setOrdersError(err.message);
                                  }
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#f59e0b', border: 'none', color: '#ffffff' }}
                              >
                                📅 Schedule Pickup
                              </button>
                            )}

                            {order.manifestUrl && (
                              <a
                                href={order.manifestUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#ffffff' }}
                              >
                                📄 View Manifest
                              </a>
                            )}

                            {['shipment_created', 'label_printed', 'packed'].includes(order.orderStatus) && (
                              <button
                                type="button"
                                className="btn btn-danger-outline"
                                onClick={() => handleCancelShipment(order)}
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                Cancel Shipment
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* MOVED TO SHIPMENT TAB */
              <>
                <div className="orders-panel-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 className="orders-panel-title">🚀 Moved to Shipment</h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Manage booked shipments, print labels, download manifests, or mark orders as shipped
                      </p>
                    </div>
                  </div>

                  {/* Bulk Actions Bar */}
                  <div className="bulk-actions-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                      <input
                        type="checkbox"
                        id="select-all-shipments"
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        checked={
                          orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length > 0 &&
                          orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).every(o => !!selectedToShipOrders[o.id])
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const shipmentsList = orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus));
                          setSelectedToShipOrders(prev => {
                            const newSel = { ...prev };
                            shipmentsList.forEach(o => {
                              newSel[o.id] = checked;
                            });
                            return newSel;
                          });
                        }}
                      />
                      <label htmlFor="select-all-shipments" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                        Select All ({orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length})
                      </label>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '8px' }}>
                      Selected: {Object.values(selectedToShipOrders).filter(Boolean).length}
                    </span>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleMarkSelectedShipped}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    >
                      🚚 Mark Selected as Shipped
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleMarkAllShipped}
                      disabled={orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled'].includes(o.orderStatus)).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}
                    >
                      🚚 Mark All as Shipped
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBulkMarkAsPacked}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
                    >
                      📦 Mark as Packed
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleBulkSchedulePickup}
                      disabled={Object.values(selectedToShipOrders).filter(Boolean).length === 0 || shipmentActionProgress.active}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                    >
                      📅 Schedule Pickup
                    </button>
                  </div>
                </div>

                {/* Shipping Action Progress Banner */}
                {(shipmentActionProgress.active || shipmentActionProgress.message) && (
                  <div className="append-progress-banner" style={{ margin: '12px 0', background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.2)' }}>
                    {shipmentActionProgress.active ? (
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2.5px', marginRight: '8px' }} />
                    ) : (
                      <CheckCircle2 size={16} style={{ color: '#10b981', marginRight: '8px' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: shipmentActionProgress.active ? '#a5b4fc' : '#10b981' }}>
                      {shipmentActionProgress.message}
                    </span>
                  </div>
                )}

                {ordersError && (
                  <div className="status-msg status-msg-error" style={{ margin: '12px 0' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{ordersError}</span>
                  </div>
                )}

                {ordersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading shipments...</p>
                  </div>
                ) : orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed var(--border-light)', borderRadius: '12px' }}>
                    <Package size={48} style={{ opacity: 0.2, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>No shipments booked yet</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px' }}>
                      Once you book shipments from "Orders to Ship", they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="orders-cards-list">
                    {orders.filter(o => ['shipment_created', 'label_printed', 'packed', 'pickup_scheduled', 'shipped'].includes(o.orderStatus)).map((order) => {
                      const isSelected = !!selectedToShipOrders[order.id];
                      return (
                        <div key={order.id} className={`order-card shipping-order-card status-${order.orderStatus}`} style={{ borderLeft: isSelected ? '4px solid var(--accent-indigo)' : '4px solid transparent' }}>
                          
                          {/* Shipping Card Header */}
                          <div className="order-card-header" style={{ paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => setSelectedToShipOrders(prev => ({ ...prev, [order.id]: e.target.checked }))}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div>
                                <div className="order-card-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  {order.customerName || 'Unknown Customer'}
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({order.id})</span>
                                </div>
                                <div className="order-card-meta">
                                  <span>📞 {order.orderedPhoneNumber || '—'}</span>
                                  <span>✉️ {order.orderedEmail || '—'}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                              <span className={`shipping-status-badge badge-${order.orderStatus}`} style={{ 
                                background: order.orderStatus === 'shipped' ? 'rgba(16, 185, 129, 0.15)' : '',
                                color: order.orderStatus === 'shipped' ? '#10b981' : ''
                              }}>
                                {order.orderStatus === 'shipment_created' && '🚚 Shipment Booked'}
                                {order.orderStatus === 'label_printed' && '🖨️ Label Printed'}
                                {order.orderStatus === 'packed' && '📦 Packed'}
                                {order.orderStatus === 'pickup_scheduled' && '📅 Pickup Scheduled'}
                                {order.orderStatus === 'shipped' && '✨ Shipped'}
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                {order.paymentMode === 'cod' ? '💵 COD' : '💳 Online'}
                              </span>
                            </div>
                          </div>

                          {/* Address & Products Details */}
                          <div style={{ fontSize: '0.82rem', padding: '12px', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <strong>📍 Shipping Address:</strong> {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - <strong>{order.shippingAddress?.pincode}</strong>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <strong>📦 Items ({order.items?.reduce((s, i) => s + (i.quantity || 1), 0)}):</strong>
                              {order.items?.map((item, idx) => (
                                <div key={idx} style={{ paddingLeft: '8px', color: 'var(--text-secondary)' }}>
                                  • {item.typeofqr === 'personalised' ? 'Personalised Tag' : 'Classic Tag'} × {item.quantity}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipment details if created */}
                          {order.awbNumber && (
                            <div style={{ fontSize: '0.8rem', padding: '10px 12px', background: 'rgba(99,102,241,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', borderTop: '1px dashed rgba(99,102,241,0.15)' }}>
                              <div><strong>AWB:</strong> {order.awbNumber}</div>
                              <div><strong>Courier:</strong> {order.courierPartner || 'NimbusPost'}</div>
                              {order.nimbuspostOrderId && <div><strong>Nimbus ID:</strong> {order.nimbuspostOrderId}</div>}
                            </div>
                          )}

                          {/* Shipping Card Actions */}
                          <div className="order-card-actions" style={{ display: 'flex', padding: '12px', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', flexWrap: 'wrap' }}>
                            
                            {order.shippingLabelUrl && (
                              <a
                                href={order.shippingLabelUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                                onClick={async () => {
                                  if (order.orderStatus === 'shipment_created') {
                                    await updateDoc(doc(firestoreDb, 'orders', order.id), {
                                      orderStatus: 'label_printed'
                                    });
                                  }
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--accent-indigo)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Download size={11} /> Download Shipping Label
                              </a>
                            )}

                            {['shipment_created', 'label_printed'].includes(order.orderStatus) && (
                              <button
                                type="button"
                                className="btn"
                                onClick={async () => {
                                  await updateDoc(doc(firestoreDb, 'orders', order.id), { orderStatus: 'packed' });
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#10b981', border: 'none', color: '#ffffff' }}
                              >
                                ✓ Mark Packed
                              </button>
                            )}

                            {order.orderStatus === 'packed' && (
                              <button
                                type="button"
                                className="btn"
                                onClick={async () => {
                                  setShipmentActionProgress({ active: true, message: 'Scheduling pickup...' });
                                  try {
                                    const res = await handleCallNimbusApi('manifest', { awbNumbers: [order.awbNumber] });
                                    await updateDoc(doc(firestoreDb, 'orders', order.id), {
                                      orderStatus: 'pickup_scheduled',
                                      manifestUrl: res.manifestUrl
                                    });
                                    setShipmentActionProgress({ active: false, message: 'Pickup scheduled successfully!' });
                                    if (res.manifestUrl) window.open(res.manifestUrl, '_blank');
                                    setTimeout(() => setShipmentActionProgress({ active: false, message: '' }), 3000);
                                  } catch (err) {
                                    setShipmentActionProgress({ active: false, message: '' });
                                    setOrdersError(err.message);
                                  }
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: '#f59e0b', border: 'none', color: '#ffffff' }}
                              >
                                📅 Schedule Pickup
                              </button>
                            )}

                            {order.manifestUrl && (
                              <a
                                href={order.manifestUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', textDecoration: 'none', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#ffffff' }}
                              >
                                📄 View Manifest
                              </a>
                            )}

                            {['packed', 'pickup_scheduled'].includes(order.orderStatus) && (
                              <button
                                type="button"
                                className="btn"
                                onClick={async () => {
                                  await updateDoc(doc(firestoreDb, 'orders', order.id), { 
                                    orderStatus: 'shipped',
                                    shippedAt: new Date()
                                  });
                                }}
                                style={{ padding: '6px 12px', fontSize: '0.78rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff' }}
                              >
                                🚚 Mark Shipped
                              </button>
                            )}

                            {['shipment_created', 'label_printed', 'packed'].includes(order.orderStatus) && (
                              <button
                                type="button"
                                className="btn btn-danger-outline"
                                onClick={() => handleCancelShipment(order)}
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              >
                                Cancel Shipment
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT: PDF Previews (collapsible accordions) */}
          <div className="orders-pdf-panel">
            <div className="glass-panel card-content" style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  📄 PDF Sheets Preview
                </h3>
                {appendedQrs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPdfSheet}
                    className="btn btn-danger-outline"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Trash2 size={10} /> Clear Sheet
                  </button>
                )}
              </div>

              {appendedQrs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-secondary)' }}>
                  <ImageIcon size={40} style={{ opacity: 0.2, marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem' }}>No QR codes yet.</p>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Press "Append All to PDF" to generate.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* ACCORDION 1: FRONT SIDE (QR CODES) */}
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                    <div 
                      onClick={() => setFrontPreviewOpen(!frontPreviewOpen)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderBottom: frontPreviewOpen ? '1px solid var(--border-light)' : 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {frontPreviewOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Front Side (QR Codes)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(); }}
                        className="btn btn-primary"
                        style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={10} /> Front PDF
                      </button>
                    </div>

                    {frontPreviewOpen && (
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        {(() => {
                          const pages = [];
                          for (let i = 0; i < appendedQrs.length; i += 12) {
                            pages.push(appendedQrs.slice(i, i + 12));
                          }
                          return pages.map((pageItems, pageIdx) => (
                            <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                Page {pageIdx + 1} of {pages.length}
                              </span>
                              <div className="pdf-preview-page">
                                {Array.from({ length: 12 }).map((_, slotIdx) => {
                                  const hasItem = slotIdx < pageItems.length;
                                  if (hasItem) {
                                    const slotEntry = pageItems[slotIdx];
                                    const slotQrUrl = slotEntry?.qrUrl ?? slotEntry;
                                    return (
                                      <div key={slotIdx} className="pdf-preview-item" style={{ background: '#fafafa' }}>
                                        {/* Render background underlay */}
                                        {slotEntry?.typeofqr === 'personalised' && (
                                          <img 
                                            src={slotEntry.version === 2 ? '/logo icon black.png' : slotEntry.imageUrl} 
                                            alt="bg" 
                                            className="pdf-preview-image" 
                                            style={{ objectFit: slotEntry.version === 2 ? 'contain' : 'cover', background: '#000000' }} 
                                          />
                                        )}
                                        {slotEntry?.typeofqr === 'classic_black' && (
                                          <div className="pdf-preview-image" style={{ background: '#000000' }} />
                                        )}
                                        {slotEntry?.typeofqr === 'classic_white' && (
                                          <div className="pdf-preview-image" style={{ background: '#ffffff' }} />
                                        )}
                                        {/* Render QR overlay */}
                                        <img src={slotQrUrl} alt={`QR ${slotIdx}`} className="pdf-preview-image" style={{ zIndex: 2 }} />
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

                  {/* ACCORDION 2: BACK SIDE (COVERS/LOGOS) */}
                  <div style={{ border: '1px solid var(--border-light)', borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.01)' }}>
                    <div 
                      onClick={() => setBackPreviewOpen(!backPreviewOpen)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderBottom: backPreviewOpen ? '1px solid var(--border-light)' : 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {backPreviewOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Back Side (Covers/Logos)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownloadLogoPdf(); }}
                        className="btn btn-success"
                        style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#ffffff' }}
                      >
                        <Download size={10} /> Back PDF
                      </button>
                    </div>

                    {backPreviewOpen && (
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        {(() => {
                          const pages = [];
                          for (let i = 0; i < appendedQrs.length; i += 12) {
                            pages.push(appendedQrs.slice(i, i + 12));
                          }
                          return pages.map((pageItems, pageIdx) => (
                            <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                Page {pageIdx + 1} of {pages.length}
                              </span>
                              <div className="pdf-preview-page">
                                {Array.from({ length: 12 }).map((_, slotIdx) => {
                                  const hasItem = slotIdx < pageItems.length;
                                  if (hasItem) {
                                    const slotEntry = pageItems[slotIdx];
                                    
                                    // Determine image src for backside cover preview
                                    let backImgSrc = '/full logo black.png';
                                    if (slotEntry?.typeofqr === 'personalised' && slotEntry?.version === 2) {
                                      backImgSrc = slotEntry?.imageUrl || '';
                                    }
                                    
                                    return (
                                      <div key={slotIdx} className="pdf-preview-item" style={{ background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {backImgSrc ? (
                                          <img src={backImgSrc} alt={`Back ${slotIdx}`} className="pdf-preview-image" style={{ objectFit: 'contain', background: '#000000' }} />
                                        ) : (
                                          <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#ef4444' }}>No Image</span>
                                        )}
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
                      <img 
                        src={landingQrs.tag1.base64Image || '/cropped_tag1.png'} 
                        onError={(e) => {
                          if (e.target.src.endsWith('/cropped_tag1.png')) {
                            e.target.src = '/cropped_tag1.jpg';
                          } else if (e.target.src.endsWith('/cropped_tag1.jpg')) {
                            e.target.src = '/logo icon black.png';
                          } else {
                            e.target.onerror = null;
                            e.target.src = '';
                          }
                        }} 
                        alt="Tag 1" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
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
                      <img 
                        src={landingQrs.tag2.base64Image || '/cropped_tag2.png'} 
                        onError={(e) => {
                          if (e.target.src.endsWith('/cropped_tag2.png')) {
                            e.target.src = '/cropped_tag2.jpg';
                          } else if (e.target.src.endsWith('/cropped_tag2.jpg')) {
                            e.target.src = '/customised.png';
                          } else {
                            e.target.onerror = null;
                            e.target.src = '';
                          }
                        }} 
                        alt="Tag 2" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
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
                      <img 
                        src={landingQrs.tag3.base64Image || '/cropped_tag3.png'} 
                        onError={(e) => {
                          if (e.target.src.endsWith('/cropped_tag3.png')) {
                            e.target.src = '/cropped_tag3.jpg';
                          } else if (e.target.src.endsWith('/cropped_tag3.jpg')) {
                            e.target.src = '/logo icon black.png';
                          } else {
                            e.target.onerror = null;
                            e.target.src = '';
                          }
                        }} 
                        alt="Tag 3" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
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
              Layout: A4 sheet, 3x4 grid (12 tags max per page). Each tag: 57mm x 57mm cutting border, 52mm x 52mm photo background (bleed), 49mm x 49mm QR code centered.
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
              for (let i = 0; i < appendedQrs.length; i += 12) {
                pages.push(appendedQrs.slice(i, i + 12));
              }
              return pages.map((pageItems, pageIdx) => (
                <div key={pageIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Page {pageIdx + 1} of {pages.length}
                  </span>
                  <div className="pdf-preview-page">
                    {Array.from({ length: 12 }).map((_, slotIdx) => {
                      const hasItem = slotIdx < pageItems.length;
                      if (hasItem) {
                        const slotEntry = pageItems[slotIdx];
                        const slotQrUrl = slotEntry?.qrUrl ?? slotEntry;
                        return (
                           <div key={slotIdx} className="pdf-preview-item" style={{ background: '#fafafa' }}>
                             {/* Render background underlay */}
                             {slotEntry?.typeofqr === 'personalised' && (
                               <img 
                                 src={slotEntry.version === 2 ? '/logo icon black.png' : slotEntry.imageUrl} 
                                 alt="bg" 
                                 className="pdf-preview-image" 
                                 style={{ objectFit: slotEntry.version === 2 ? 'contain' : 'cover', background: '#000000' }} 
                               />
                             )}
                             {slotEntry?.typeofqr === 'classic_black' && (
                               <div className="pdf-preview-image" style={{ background: '#000000' }} />
                             )}
                             {slotEntry?.typeofqr === 'classic_white' && (
                               <div className="pdf-preview-image" style={{ background: '#ffffff' }} />
                             )}
                             {/* Render QR overlay */}
                             <img
                               src={slotQrUrl}
                               alt={`QR Slot ${slotIdx}`}
                               className="pdf-preview-image"
                               style={{ zIndex: 2 }}
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

    </div>
  );
};

export default AdminPanel;
