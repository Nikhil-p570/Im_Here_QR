/* eslint-disable no-unused-vars, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs
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
  Plus
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

  // PDF Sheet State
  const [appendedQrs, setAppendedQrs] = useState([]);

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
    const margin = 2;
    const totalModules = moduleCount + margin * 2;
    const moduleSize = qrSize / totalModules;
    const bannerH = hasFrame ? 70 : 0;

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
          drawDot(ctx, row, col, margin, moduleSize, dotColor, dotShape, 0, dotSize / 100);
        }
      }
    }

    // Draw corners
    drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, cornerShape, 0);
    drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, cornerShape, 0);
    drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, cornerShape, 0);

    // Reset shadow properties before drawing logo and banner
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw Logo Chip
    if (logoCanvas && showLogoChip) {
      drawLogo(ctx, logoCanvas, qrSize, 0, logoScale / 100, bgColor);
    }

    // Draw banner frame (below QR code)
    if (hasFrame) {
      drawBanner(ctx, qrSize, bannerH, frameText, frameBgColor, frameTextColor, qrSize);
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
    cropState.size
  ]);

  // Render crop preview canvas
  useEffect(() => {
    if (cropState.showCropStep && cropCanvasRef.current && uploadedImg) {
      const ctx = cropCanvasRef.current.getContext('2d');
      cropCanvasRef.current.width = cropState.dispW;
      cropCanvasRef.current.height = cropState.dispH;
      ctx.drawImage(uploadedImg, 0, 0, cropState.dispW, cropState.dispH);
    }
  }, [cropState.showCropStep, cropState.dispW, cropState.dispH, uploadedImg]);

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

  const handleAppendToPdf = () => {
    if (!qrImageUrl) {
      setDownloadError("Please generate a QR code first.");
      return;
    }
    setAppendedQrs(prev => [...prev, qrImageUrl]);
    
    // Auto-save generated customer ID to Firestore if not saved yet (same as PNG download)
    if (result && !result.isSavedToDb) {
      saveResultToFirestore(result).catch((err) => {
        console.error("Background Firestore save failed:", err);
      });
    }
  };

  const handleRemoveLastQr = () => {
    if (appendedQrs.length === 0) return;
    const confirmUndo = window.confirm("Are you sure you want to undo and remove the recently added QR code?");
    if (confirmUndo) {
      setAppendedQrs(prev => prev.slice(0, -1));
    }
  };

  const handleClearPdfSheet = () => {
    if (appendedQrs.length === 0) return;
    const confirmClear = window.confirm("Are you sure you want to clear all appended QR codes from this sheet?");
    if (confirmClear) {
      setAppendedQrs([]);
    }
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
    const marginX = 15;
    const marginY = 28.5;

    appendedQrs.forEach((qrUrl, index) => {
      const pageIndex = index % itemsPerPage;
      
      // Page division
      if (index > 0 && pageIndex === 0) {
        pdf.addPage();
      }

      const row = Math.floor(pageIndex / 4);
      const col = pageIndex % 4;

      const x = marginX + col * colWidth;
      const y = marginY + row * rowHeight;

      // 1. Draw outer grey border (45mm x 60mm)
      pdf.setDrawColor(209, 213, 219); // light grey (#d1d5db)
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, 45, 60);

      // 2. Add QR image centered (40mm x 55mm), leaving 2.5mm margin on all sides
      pdf.addImage(qrUrl, "PNG", x + 2.5, y + 2.5, 40, 55);
    });

    pdf.save("qr-print-sheet.pdf");
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

      if (querySnapshot.empty) {
        setAdminSuccess("Database is already empty!");
        setShowConfirm(false);
        return;
      }

      const deletePromises = querySnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);

      setResult(null);
      setQrImageUrl("");
      setHasBeenGeneratedOnce(false);
      setAdminSuccess("All documents deleted successfully!");
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
      y: clamp(dragStart.boxY + dy, 0, prev.dispW - prev.size)
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
              <div style={{ position: 'relative', overflow: 'hidden' }}>
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
                  style={{ width: '100%', borderStyle: 'dashed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => document.getElementById('qrImageInput').click()}
                >
                  <ImageIcon size={18} />
                  {uploadedImg ? "Change Logo Image" : "Upload Logo Image"}
                </button>
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
                        border: '2.5px dashed #e8402c',
                        background: 'rgba(232, 64, 44, 0.18)',
                        cursor: dragging ? 'grabbing' : 'grab',
                        borderRadius: '6px',
                        width: `${cropState.size}px`,
                        height: `${cropState.size}px`,
                        left: `${cropState.x}px`,
                        top: `${cropState.y}px`
                      }}
                    />
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
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {appendedQrs.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleRemoveLastQr}
                  className="btn"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearPdfSheet}
                  className="btn"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Clear Sheet
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', fontWeight: 700 }}
                >
                  <Download size={14} />
                  DOWNLOAD PDF ({appendedQrs.length} {appendedQrs.length === 1 ? 'Tag' : 'Tags'})
                </button>
              </>
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
                        return (
                          <div key={slotIdx} className="pdf-preview-item">
                            <img
                              src={pageItems[slotIdx]}
                              alt={`QR Slot ${slotIdx}`}
                              className="pdf-preview-image"
                            />
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={slotIdx}
                            className="pdf-preview-item-empty"
                          />
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
