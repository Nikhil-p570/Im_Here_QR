/* eslint-disable no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import './AdminPanel.css';
import AdminHeader from './admin/AdminHeader';
import QRGeneratorTab from './admin/QRGeneratorTab';
import OrdersTab from './admin/OrdersTab';
import LandingQRsTab from './admin/LandingQRsTab';
import ScanFinderTab from './admin/ScanFinderTab';

import { jsPDF } from 'jspdf';
import { Html5Qrcode } from 'html5-qrcode';
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

  // Scan Finder States
  const [lookupId, setLookupId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [showAddTagOption, setShowAddTagOption] = useState(null);
  // Reset / Delete Tag Data States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");

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
        if (uploadedImg) {
          const s = cropState.scale || 1;
          const srcX = cropState.x * s;
          const srcY = cropState.y * s;
          const srcSize = cropState.size * s;
          ctx.drawImage(uploadedImg, srcX, srcY, srcSize, srcSize, 0, 0, canvas.width, canvas.height);
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
    } catch { }

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
    } catch { }

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

  // Helper: load customer's image from Storage/base64 and create a high-res cropped canvas
  const loadCroppedLogoCanvas = (imageUrl, cropX, cropY, cropSize, applyDarkness = false) => {
    return new Promise((resolve) => {
      const img = new Image();
      if (imageUrl && !imageUrl.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const out = document.createElement('canvas');
        out.width = 640;
        out.height = 640;
        const ctx = out.getContext('2d');
        // Ensure white background to prevent transparent-to-black JPEG conversion issues
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 640, 640);
        
        try {
          let cx = cropX;
          let cy = cropY;
          let cSize = cropSize;
          if (cx === undefined || cy === undefined || !cSize) {
            cSize = Math.min(img.width, img.height);
            cx = Math.round((img.width - cSize) / 2);
            cy = Math.round((img.height - cSize) / 2);
          }
          ctx.drawImage(img, cx, cy, cSize, cSize, 0, 0, 640, 640);
          
          if (applyDarkness) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, 640, 640);
            ctx.globalAlpha = 1.0; // reset
          }
        } catch (e) {
          console.warn('loadCroppedLogoCanvas drawImage failed:', e);
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
            logoCanvas = await loadCroppedLogoCanvas(
              item.imageUrl || item.tempBase64Image,
              item.srcCropX,
              item.srcCropY,
              item.srcCropSize
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

    const s = cropState.scale || 1;
    const entry = {
      qrUrl: transparentQrUrl, // Store transparent version in the PDF entry!
      destUrl: qrUrl.trim(),
      id: result?.id || null,
      typeofqr: uploadedImg ? 'personalised' : (bgColor === '#ffffff' ? 'classic_white' : 'classic_black'),
      version: selectedVersion,
      imageUrl: uploadedImg ? uploadedImg.src : '',
      srcCropX: Math.round(cropState.x * s),
      srcCropY: Math.round(cropState.y * s),
      srcCropSize: Math.round(cropState.size * s),
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
      setAppendedQrs([]);
      setUndoneQrs([]);
      localStorage.removeItem('pdfSheet_appendedQrs');
      localStorage.removeItem('pdfSheet_undoneQrs');
    }
  };

  const [cameraActive, setCameraActive] = useState(false);
  const qrScannerRef = useRef(null);

  const cameraIntervalRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Packing Box Session Helper States
  const [packingSessionActive, setPackingSessionActive] = useState(false);
  const [packingPhoneToBoxMap, setPackingPhoneToBoxMap] = useState({});
  const [maxBoxNumber, setMaxBoxNumber] = useState(0);
  const [lastAssignedBox, setLastAssignedBox] = useState(null);
  const [packingBoxesData, setPackingBoxesData] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  const [packingHistory, setPackingHistory] = useState([]);

  const packingBoxesDataRef = useRef(packingBoxesData);
  useEffect(() => {
    packingBoxesDataRef.current = packingBoxesData;
  }, [packingBoxesData]);

  const packingSessionActiveRef = useRef(packingSessionActive);
  useEffect(() => {
    packingSessionActiveRef.current = packingSessionActive;
  }, [packingSessionActive]);

  const packingPhoneToBoxMapRef = useRef(packingPhoneToBoxMap);
  useEffect(() => {
    packingPhoneToBoxMapRef.current = packingPhoneToBoxMap;
  }, [packingPhoneToBoxMap]);

  const lastScannedTagRef = useRef({ id: '', time: 0 });

  const startCamera = async () => {
    setCameraActive(true);
    setLookupError("");
    setLookupResult(null);
    lastScannedTagRef.current = { id: '', time: 0 }; // reset on camera start

    // Give DOM a tick to render the video element
    setTimeout(async () => {
      try {
        // 1. Request standard camera permissions via the official library method
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          throw new Error("No camera devices found on this device.");
        }

        const video = document.getElementById("camera-video");
        if (!video) throw new Error("Video element not found");

        // 2. Request back camera stream using standard facingMode constraint
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });

        video.srcObject = stream;
        await video.play().catch((err) => console.warn("Autoplay was blocked or failed:", err));
        cameraStreamRef.current = stream;

        const html5QrCode = new Html5Qrcode("qr-file-reader");
        qrScannerRef.current = html5QrCode;

        // Process decoded QR text safely
        const processDecodedText = async (decodedText) => {
          const now = Date.now();
          // Throttle duplicate scans of the same tag ID to once every 2.5 seconds
          if (lastScannedTagRef.current.id === decodedText && now - lastScannedTagRef.current.time < 2500) {
            return;
          }
          lastScannedTagRef.current = { id: decodedText, time: now };

          if (!packingSessionActiveRef.current) {
            stopCamera();
          }
          setLookupId(decodedText);
          await performLookup(decodedText);
        };

        // Start real-time frame capturing and scanning loop (every 400ms)
        const scanInterval = setInterval(async () => {
          if (!video || video.paused || video.ended) return;

          const canvas = document.createElement("canvas");
          const targetWidth = 480;
          const scale = targetWidth / (video.videoWidth || 640);
          canvas.width = targetWidth;
          canvas.height = (video.videoHeight || 480) * scale;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const originalFile = new File([blob], "frame.png", { type: "image/png" });
            try {
              // 1. Try scanning original (dark-on-light) frame
              const decodedText = await html5QrCode.scanFile(originalFile, false);
              await processDecodedText(decodedText);
            } catch (err) {
              // 2. Original failed, try scanning inverted (light-on-dark) frame
              try {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                  data[i] = 255 - data[i];     // Red
                  data[i + 1] = 255 - data[i + 1]; // Green
                  data[i + 2] = 255 - data[i + 2]; // Blue
                }
                ctx.putImageData(imgData, 0, 0);

                canvas.toBlob(async (invertedBlob) => {
                  if (!invertedBlob) return;
                  const invertedFile = new File([invertedBlob], "inverted_frame.png", { type: "image/png" });
                  try {
                    const decodedText = await html5QrCode.scanFile(invertedFile, false);
                    await processDecodedText(decodedText);
                  } catch (invertErr) {
                    // Both scan attempts failed for this frame, continue loop
                  }
                }, "image/png");
              } catch (invertProcessErr) {
                // Inversion process failed, continue loop
              }
            }
          }, "image/png");
        }, 400);

        cameraIntervalRef.current = scanInterval;
      } catch (err) {
        console.error("Camera startup failed:", err);
        let msg = "Could not access camera";
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          msg += ": Permissions denied. Please check your browser site settings.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          msg += ": Camera is already in use by another tab or app.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          msg += ": No camera found on this device.";
        } else if (err.name === "OverconstrainedError") {
          msg += ": No camera matches the requested constraints.";
        } else {
          msg += `: ${err.message || err.toString()}`;
        }
        setLookupError(msg);
        setCameraActive(false);
      }
    }, 100);
  };

  const stopCamera = () => {
    if (cameraIntervalRef.current) {
      clearInterval(cameraIntervalRef.current);
      cameraIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
    qrScannerRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (cameraIntervalRef.current) {
        clearInterval(cameraIntervalRef.current);
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const performLookup = async (idValue) => {
    if (!idValue.trim()) {
      setLookupError("Please enter a Tag ID or paste a QR link.");
      setLookupResult(null);
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setShowAddTagOption(null);

    // Extract 8-character ID if full URL is pasted
    let tagId = idValue.trim();
    if (tagId.includes('?=')) {
      tagId = tagId.split('?=')[1];
    } else if (tagId.includes('/')) {
      const parts = tagId.split('/');
      tagId = parts[parts.length - 1];
    }
    // Clean up any query params if present
    tagId = tagId.split('&')[0];

    try {
      // 1. Fetch Link Doc
      const linkRef = doc(firestoreDb, 'links', tagId);
      const linkSnap = await getDoc(linkRef);

      if (!linkSnap.exists()) {
        setLookupError(`Tag ID "${tagId}" not found in links database.`);
        setShowAddTagOption(tagId);
        setLookupLoading(false);
        return;
      }

      const linkData = linkSnap.data();
      let orderData = null;

      // 2. Fetch Customer Order Doc if associated
      if (linkData.firestoreOrderId) {
        const orderRef = doc(firestoreDb, 'orders', linkData.firestoreOrderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          orderData = orderSnap.data();
        }
      }

      // Calculate total quantity
      let totalQuantity = 0;
      if (orderData) {
        totalQuantity = (orderData.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      } else {
        // Fallback to 1 if no order data but manual qr exists
        totalQuantity = 1;
      }

      let formattedAddress = 'N/A';
      if (orderData?.shippingAddress) {
        const addrObj = orderData.shippingAddress;
        formattedAddress = `${addrObj.address || ''}, ${addrObj.city || ''}, ${addrObj.state || ''} - ${addrObj.pincode || ''}`;
      }

      const lookupObj = {
        totalQuantity,
        customerName: orderData?.customerName || 'N/A',
        orderedPhoneNumber: orderData?.orderedPhoneNumber || linkData.orderedPhoneNumber || 'N/A',
        orderedEmail: orderData?.orderedEmail || linkData.orderedEmail || 'N/A',
        tagId: tagId,
        firestoreOrderId: linkData.firestoreOrderId || 'N/A',
        shippingAddress: formattedAddress,
        // Tag registration status — needed to show Delete Data button
        tagStatus: linkData.status || 'unregistered',
        tagName: linkData.name || '',
        tagNumber: linkData.number || ''
      };

      setShowResetConfirm(false);
      setResetSuccess("");
      setResetError("");
      setLookupResult(lookupObj);

      if (packingSessionActiveRef.current) {
        const groupingKey = lookupObj.orderedPhoneNumber !== 'N/A' ? lookupObj.orderedPhoneNumber : (lookupObj.firestoreOrderId !== 'N/A' ? lookupObj.firestoreOrderId : tagId);
        
        const prevMap = packingPhoneToBoxMapRef.current;
        let boxNum = prevMap[groupingKey];
        let isNew = false;
        
        if (!boxNum) {
          const values = Object.values(prevMap);
          const currentMax = values.length > 0 ? Math.max(...values) : 0;
          boxNum = currentMax + 1;
          isNew = true;
        }
        
        const resultDetail = {
          boxNumber: boxNum,
          tagId: tagId,
          customerName: lookupObj.customerName,
          isNew: isNew,
          timestamp: new Date().toLocaleTimeString()
        };
        
        setPackingPhoneToBoxMap(prev => ({
          ...prev,
          [groupingKey]: boxNum
        }));
        
        setPackingBoxesData(prevBoxes => {
          const existing = prevBoxes[boxNum] || {
            customerName: lookupObj.customerName,
            orderedPhoneNumber: lookupObj.orderedPhoneNumber,
            orderedEmail: lookupObj.orderedEmail,
            address: lookupObj.shippingAddress,
            tags: []
          };
          
          const updatedTags = existing.tags.includes(tagId) 
            ? existing.tags 
            : [...existing.tags, tagId];
            
          return {
            ...prevBoxes,
            [boxNum]: {
              ...existing,
              tags: updatedTags
            }
          };
        });

        setLastAssignedBox(resultDetail);
        setPackingHistory(prev => [resultDetail, ...prev]);
        if (isNew) {
          setMaxBoxNumber(boxNum);
        }
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setLookupError(`Error looking up tag: ${err.message}`);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAddMissingTag = async (tagId) => {
    if (!firestoreDb) {
      setLookupError("Database not connected.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    try {
      const docRef = doc(firestoreDb, 'links', tagId);
      await setDoc(docRef, {
        id: tagId,
        domain: predefinedDomain,
        qrCodeUrl: `${predefinedDomain}/id?=${tagId}`,
        status: 'active',
        createdAt: new Date()
      });
      setShowAddTagOption(null);
      // Automatically perform lookup now that it exists
      await performLookup(tagId);
    } catch (err) {
      console.error("Failed to add missing tag:", err);
      setLookupError(`Failed to add tag to database: ${err.message}`);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupTag = async (e) => {
    if (e) e.preventDefault();
    await performLookup(lookupId);
  };

  // Reset / Delete user data from a registered tag
  const handleResetTagData = async () => {
    if (!lookupResult || !firestoreDb) return;
    const tagId = lookupResult.tagId;
    setResetLoading(true);
    setResetError("");
    setResetSuccess("");
    try {
      // 1. Reset the public links doc — clear all user-entered fields, keep order metadata
      const publicRef = doc(firestoreDb, 'links', tagId);
      await updateDoc(publicRef, {
        status: 'unregistered',
        name: '',
        number: '',
        altNumber: '',
        whatsappEnabled: false,
        message: '',
        rewardEnabled: false,
        rewardAmount: '',
        socials: [],
        resetAt: new Date().toISOString()
      });
      // 2. Delete the private credentials doc (password hash, security answer)
      const privateRef = doc(firestoreDb, 'links_private', tagId);
      await deleteDoc(privateRef);

      setResetSuccess("Tag data cleared. QR is now fresh and unregistered.");
      setShowResetConfirm(false);
      // Update local lookupResult to reflect new status
      setLookupResult(prev => ({
        ...prev,
        tagStatus: 'unregistered',
        tagName: '',
        tagNumber: ''
      }));
    } catch (err) {
      console.error("Reset tag data failed:", err);
      setResetError(`Failed to clear tag data: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const scanFileWithInversionFallback = async (html5QrCode, file) => {
    try {
      // 1. Try scanning the original image first
      const result = await html5QrCode.scanFile(file, false);
      return result;
    } catch (originalErr) {
      console.log("Original scan failed, attempting color inversion fallback...");

      // 2. Load file into an Image object to invert pixels
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = async () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);

              // Invert colors (needed for white dots/corners on dark background images)
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgData.data;
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];     // Red
                data[i + 1] = 255 - data[i + 1]; // Green
                data[i + 2] = 255 - data[i + 2]; // Blue
              }
              ctx.putImageData(imgData, 0, 0);

              canvas.toBlob(async (blob) => {
                if (!blob) {
                  reject(new Error("Canvas blob generation failed"));
                  return;
                }
                const invertedFile = new File([blob], "inverted.png", { type: "image/png" });
                try {
                  const invertedResult = await html5QrCode.scanFile(invertedFile, false);
                  resolve(invertedResult);
                } catch (invertErr) {
                  reject(new Error("Could not detect any QR code in this image. Make sure the QR is clear and well-lit."));
                }
              }, "image/png");
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error("Failed to load image for inversion"));
          img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUploadQrFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLookupError("");
    setLookupResult(null);
    setLookupLoading(true);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-reader");
      const decodedText = await scanFileWithInversionFallback(html5QrCode, file);
      setLookupId(decodedText);
      await performLookup(decodedText);
    } catch (err) {
      console.error("QR file scan failed:", err);
      setLookupError(err.message || "Could not detect any QR code in this image. Make sure the QR is clear and well-lit.");
    } finally {
      setLookupLoading(false);
      e.target.value = "";
    }
  };

  const renderGuideOverlay = (pageIdx, slotIdx) => {
    return null;
  };

  const handleDownloadPdf = async () => {
    if (appendedQrs.length === 0) return;

    setShipmentActionProgress({ active: true, message: "Preparing frontside print sheet..." });

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
            const customCanvas = await loadCroppedLogoCanvas(
              entry.imageUrl,
              entry.srcCropX,
              entry.srcCropY,
              entry.srcCropSize,
              true // Apply 40% darkness overlay
            );
            if (customCanvas) {
              pdf.addImage(customCanvas.toDataURL('image/jpeg', 0.95), "JPEG", x + 2.5, y + 2.5, 52, 52);
            }
          }
        }
      } else if (entry?.typeofqr === 'classic_black') {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(x + 2.5, y + 2.5, 52, 52, "F");
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(x + 2.5, y + 2.5, 52, 52, "F");
      }

      // 3. Add QR image centered (49mm x 49mm), leaving 1.5mm margin
      pdf.addImage(qrUrl, "PNG", x + 4.0, y + 4.0, 49, 49);
    }

    pdf.save("qr-print-sheet.pdf");
    setShipmentActionProgress({ active: false, message: "" });
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
          const customCanvas = await loadCroppedLogoCanvas(
            entry.imageUrl,
            entry.srcCropX,
            entry.srcCropY,
            entry.srcCropSize
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
      <AdminHeader
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
        orders={orders}
        handleNew={handleNew}
        showConfirm={showConfirm}
        setShowConfirm={setShowConfirm}
        countdown={countdown}
        setCountdown={setCountdown}
        clearing={clearing}
        handleClearDatabase={handleClearDatabase}
        handleClearOrders={handleClearOrders}
        onLogout={onLogout}
        loading={loading}
      />

      {activeAdminTab === 'generator' && (
        <QRGeneratorTab
          predefinedDomain={predefinedDomain} handleGenerateId={handleGenerateId} loading={loading} clearing={clearing}
          error={error} result={result} copied={copied} handleCopyLink={handleCopyLink}
          qrUrl={qrUrl} setQrUrl={setQrUrl} handleImageUpload={handleImageUpload} uploadedImg={uploadedImg}
          setUploadedImg={setUploadedImg} cropState={cropState} setCropState={setCropState} cropCanvasRef={cropCanvasRef}
          handleCropBoxDown={handleCropBoxDown} handleCropBoxMove={handleCropBoxMove} handleCropBoxUp={handleCropBoxUp}
          dragging={dragging} handleCropSizeChange={handleCropSizeChange} logoScale={logoScale} setLogoScale={setLogoScale}
          dotColor={dotColor} setDotColor={setDotColor} bgColor={bgColor} setBgColor={setBgColor} bgMode={bgMode} setBgMode={setBgMode}
          setShowLogoChip={setShowLogoChip} selectedVersion={selectedVersion} setSelectedVersion={setSelectedVersion}
          overlayDarkness={overlayDarkness} setOverlayDarkness={setOverlayDarkness} showLogoChip={showLogoChip}
          dotSize={dotSize} setDotSize={setDotSize} dotShape={dotShape} setDotShape={setDotShape} cornerShape={cornerShape}
          setCornerShape={setCornerShape} hasFrame={hasFrame} setHasFrame={setHasFrame} frameText={frameText} setFrameText={setFrameText}
          frameBgColor={frameBgColor} setFrameBgColor={setFrameBgColor} frameTextColor={frameTextColor} setFrameTextColor={setFrameTextColor}
          qrNoteText={qrNoteText} qrNoteClass={qrNoteClass} handlePresetSelect={handlePresetSelect}
          handleSavePrices={handleSavePrices} personalisedOriginal={personalisedOriginal} setPersonalisedOriginal={setPersonalisedOriginal}
          personalisedDiscounted={personalisedDiscounted} setPersonalisedDiscounted={setPersonalisedDiscounted}
          classicOriginal={classicOriginal} setClassicOriginal={setClassicOriginal} classicDiscounted={classicDiscounted}
          setClassicDiscounted={setClassicDiscounted} savingPrices={savingPrices} pricingSuccess={pricingSuccess}
          pricingError={pricingError} qrImageUrl={qrImageUrl} flipPreview={flipPreview} setFlipPreview={setFlipPreview}
          getBacksidePreviewUrl={getBacksidePreviewUrl} hasBeenGeneratedOnce={hasBeenGeneratedOnce}
          handleAppendToPdf={handleAppendToPdf} appendedQrs={appendedQrs} handleRemoveLastQr={handleRemoveLastQr}
          handleDownload={handleDownload} downloadError={downloadError} qrCanvasRef={qrCanvasRef}
        />
      )}

      {activeAdminTab === 'orders' && (
        <OrdersTab
          orders={orders} ordersLoading={ordersLoading} ordersError={ordersError} ordersSubTab={ordersSubTab}
          setOrdersSubTab={setOrdersSubTab} appendProgress={appendProgress} handleAppendAllToPdf={handleAppendAllToPdf}
          expandedOrders={expandedOrders} setExpandedOrders={setExpandedOrders} selectedToShipOrders={selectedToShipOrders}
          setSelectedToShipOrders={setSelectedToShipOrders} shipmentActionProgress={shipmentActionProgress}
          handleBulkBookShipments={handleBulkBookShipments} handleBulkMarkAsPacked={handleBulkMarkAsPacked}
          handleBulkSchedulePickup={handleBulkSchedulePickup} handleMarkSelectedShipped={handleMarkSelectedShipped}
          handleMarkAllShipped={handleMarkAllShipped} nimbusWallet={nimbusWallet} shippingRates={shippingRates}
          ratesLoading={ratesLoading} fetchingWallet={fetchingWallet} handleBookShipment={handleBookShipment}
          handleCallNimbusApi={handleCallNimbusApi} handleCancelShipment={handleCancelShipment} appendedQrs={appendedQrs}
          handleClearPdfSheet={handleClearPdfSheet} frontPreviewOpen={frontPreviewOpen} setFrontPreviewOpen={setFrontPreviewOpen}
          backPreviewOpen={backPreviewOpen} setBackPreviewOpen={setBackPreviewOpen} handleDownloadPdf={handleDownloadPdf}
          handleDownloadLogoPdf={handleDownloadLogoPdf} renderGuideOverlay={renderGuideOverlay} firestoreDb={firestoreDb}
          doc={doc} updateDoc={updateDoc}
        />
      )}

      {activeAdminTab === 'landing_qrs' && (
        <LandingQRsTab
          landingQrs={landingQrs} setLandingQrs={setLandingQrs} handleLandingImageUpload={handleLandingImageUpload}
          croppingLandingTag={croppingLandingTag} cropState={cropState} handleCropBoxDown={handleCropBoxDown}
          handleCropBoxMove={handleCropBoxMove} handleCropBoxUp={handleCropBoxUp} dragging={dragging}
          handleCropSizeChange={handleCropSizeChange} handleApplyLandingCrop={handleApplyLandingCrop}
          setCroppingLandingTag={setCroppingLandingTag} setLandingCropImage={setLandingCropImage} setCropState={setCropState}
          landingPreviewCanvasRef={landingPreviewCanvasRef} handleSaveLandingQrs={handleSaveLandingQrs}
          savingLandingQrs={savingLandingQrs} landingSuccess={landingSuccess} landingError={landingError}
          cropCanvasRef={cropCanvasRef}
        />
      )}

      {activeAdminTab === 'finder' && (
        <ScanFinderTab />
      )}
    </div>
  );
};

export default AdminPanel;
