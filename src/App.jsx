import { useState, useEffect, useRef } from 'react';
import { initializeFirebase } from './firebase';
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
  Database,
  Lock,
  LogOut,
  ShieldCheck,
  Image as ImageIcon,
  Download,
  Mail,
  Plus,
  User,
  Phone,
  ExternalLink
} from 'lucide-react';

const PRESETS = [
  { name: 'Black on White', dot: '#000000', bg: '#ffffff' },
  { name: 'White on Black', dot: '#ffffff', bg: '#000000' },
  { name: 'Red on White', dot: '#e8402c', bg: '#ffffff' },
  { name: 'Navy on Cream', dot: '#1b2a4a', bg: '#f4f1ea' },
];

const BrandIcon = ({ type, size = 16, className, style }) => {
  if (type === 'Email') {
    return <Mail size={size} className={className} style={style} />;
  }
  if (type === 'LinkedIn') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (type === 'GitHub') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    );
  }
  if (type === 'Instagram') {
    return (
      <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  return <Globe size={size} className={className} style={style} />;
};

const ensureQrLib = async () => {
  if (typeof window.qrcode !== 'undefined') return true;
  const urls = [
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/2.0.4/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.js'
  ];
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };
  for (const u of urls) {
    try {
      await loadScript(u);
      if (typeof window.qrcode !== 'undefined') return true;
    } catch (e) {
      // try next
    }
  }
  return false;
};

function App() {
  const isMainLanding = window.location.pathname !== '/admin1226';
  const predefinedDomain = "https://im-here-qr.vercel.app";

  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Firestore DB Instance State
  const [firestoreDb, setFirestoreDb] = useState(null);

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
  const [overlayDarkness, setOverlayDarkness] = useState(30);
  const [showLogoChip, setShowLogoChip] = useState(false);
  const [dotSize, setDotSize] = useState(60);
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

  // Customer-facing tag states
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerData, setCustomerData] = useState(null);

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [socials, setSocials] = useState([]);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [savingReg, setSavingReg] = useState(false);
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null);

  const cropCanvasRef = useRef(null);
  const qrCanvasRef = useRef(null);

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

  const getUrlId = () => {
    if (window.location.pathname === '/id') {
      const search = window.location.search;
      if (search.startsWith('?=')) {
        return search.substring(2).trim();
      } else if (search.startsWith('?id=')) {
        return search.substring(4).trim();
      } else if (search.substring(1).trim()) {
        return search.substring(1).trim();
      }
    }
    return null;
  };

  // Load customer QR tag details if ID is present
  useEffect(() => {
    const customerId = getUrlId();
    if (!customerId) return;

    const initCustomerDb = async () => {
      setCustomerLoading(true);
      setCustomerError("");
      let db = firestoreDb;

      if (!db) {
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
            setFirestoreDb(dbInstance);
            db = dbInstance;
          } catch (err) {
            console.error("Firebase dynamic initialization failed:", err);
          }
        }
      }

      if (db) {
        try {
          const docRef = doc(db, 'links', customerId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setCustomerData(data);
          } else {
            setCustomerError("This QR Tag ID does not exist or has been removed.");
          }
        } catch (err) {
          console.error(err);
          setCustomerError(`Failed to fetch QR details: ${err.message}`);
        } finally {
          setCustomerLoading(false);
        }
      } else {
        setCustomerError("Could not connect to database.");
        setCustomerLoading(false);
      }
    };

    initCustomerDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestoreDb]);

  // Sync generated customer link to QR URL input
  useEffect(() => {
    if (result && result.url) {
      setQrUrl(result.url);
      setHasBeenGeneratedOnce(true);
    }
  }, [result]);

  // Auto-regenerate QR code on any layout/style/parameter change
  useEffect(() => {
    if (qrUrl.trim()) {
      handleGenerateQR();
    } else {
      setQrImageUrl("");
      setQrNoteText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Close custom dropdowns on clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownIdx(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
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

  // Action: Log In
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) {
      setAuthError("Please enter the password.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    let apiSuccess = false;

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          apiSuccess = true;
          const dbInstance = initializeFirebase(data.config);
          setFirestoreDb(dbInstance);
          sessionStorage.setItem('im_here_authenticated', 'true');
          sessionStorage.setItem('im_here_firebase_config', JSON.stringify(data.config));
          setIsAuthenticated(true);
          setPassword("");
          setAuthLoading(false);
          return;
        } else {
          setAuthError(data.error || "Incorrect password. Please try again.");
          setAuthLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API verify failed, attempting local fallback check:", err);
    }

    // Fallback for local development
    if (!apiSuccess) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        const localPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'Nikhil@2006';
        if (password === localPassword) {
          const localConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
            measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
          };

          try {
            const dbInstance = initializeFirebase(localConfig);
            setFirestoreDb(dbInstance);
            sessionStorage.setItem('im_here_authenticated', 'true');
            sessionStorage.setItem('im_here_firebase_config', JSON.stringify(localConfig));
            setIsAuthenticated(true);
            setPassword("");
          } catch (initErr) {
            setAuthError(`Local config error: ${initErr.message}`);
          }
        } else {
          setAuthError("Incorrect password (local fallback check).");
        }
      } else {
        setAuthError("Network error. Unable to verify password.");
      }
    }

    setAuthLoading(false);
  };

  // Action: Log Out
  const handleLogout = () => {
    sessionStorage.removeItem('im_here_authenticated');
    sessionStorage.removeItem('im_here_firebase_config');
    setIsAuthenticated(false);
    setFirestoreDb(null);
    setResult(null);
    setShowConfirm(false);
    setCountdown(0);
    setAdminSuccess("");
    setAdminError("");
    setQrUrl("");
    setUploadedImg(null);
    setQrImageUrl("");
    setQrNoteText("");
    setHasBeenGeneratedOnce(false);
    setCropState({
      x: 0,
      y: 0,
      size: 120,
      dispW: 0,
      dispH: 0,
      scale: 1,
      showCropStep: false
    });
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

  const handleAddSocial = () => {
    setSocials(prev => [...prev, { type: 'Email', value: '', label: '' }]);
  };

  const handleRemoveSocial = (idx) => {
    setSocials(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSocialFieldChange = (idx, field, val) => {
    setSocials(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const handleSaveRegistration = async (e) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    setSavingReg(true);

    const nameVal = regName.trim();
    const numberVal = regNumber.replace(/\D/g, ''); // digits only
    const passwordVal = regPassword.trim();

    // 1. Core validations
    if (!numberVal) {
      setRegError("Contact phone number is required.");
      setSavingReg(false);
      return;
    }
    if (numberVal.length !== 10) {
      setRegError("Phone number must be exactly 10 digits.");
      setSavingReg(false);
      return;
    }
    if (!passwordVal) {
      setRegError("Please specify a tag password so you can update details later.");
      setSavingReg(false);
      return;
    }

    // 2. Social fields validation
    const cleanedSocials = [];
    for (const social of socials) {
      const type = social.type;
      let val = social.value.trim();
      let lbl = social.label.trim();

      if (!val) continue; // ignore empty value lines

      if (type === 'Email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setRegError(`Please enter a valid email address: "${val}"`);
          setSavingReg(false);
          return;
        }
        lbl = 'Email';
      } else {
        if (type !== 'Custom Link' && !lbl) {
          lbl = type;
        }
        if (type === 'Custom Link' && !lbl) {
          setRegError("Please enter a title for your custom link.");
          setSavingReg(false);
          return;
        }
        // Normalize typical URL structures
        if (val.includes('.') && !/^https?:\/\//i.test(val)) {
          val = `https://${val}`;
        }
      }

      cleanedSocials.push({ type, label: lbl, value: val });
    }

    try {
      const customerId = getUrlId();
      if (!customerId) throw new Error("No customer ID found in URL.");

      const docRef = doc(firestoreDb, 'links', customerId);

      const updatePayload = {
        status: 'registered',
        registeredAt: new Date(),
        name: nameVal,
        number: numberVal,
        password: passwordVal,
        socials: cleanedSocials
      };

      await setDoc(docRef, updatePayload, { merge: true });

      setRegSuccess("Finally claimed! We're official now. 😉🎉");
      setCustomerData(prev => ({
        ...prev,
        ...updatePayload
      }));
    } catch (err) {
      console.error(err);
      setRegError(`Failed to save details: ${err.message}`);
    } finally {
      setSavingReg(false);
    }
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

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

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

  // QR Canvas drawing math
  const roundRectPath = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  const fillShape = (ctx, x, y, size, color, shape) => {
    ctx.fillStyle = color;
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 'rounded') {
      roundRectPath(ctx, x, y, size, size, size * 0.28);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, size, size);
    }
  };

  const isFinderArea = (row, col, n) => {
    return (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7);
  };

  const drawDot = (ctx, row, col, margin, moduleSize, color, shape, offsetY, sizePct) => {
    const x = (col + margin) * moduleSize;
    const y = (row + margin) * moduleSize + offsetY;
    const s = moduleSize * sizePct;
    const inset = (moduleSize - s) / 2;
    if (shape === 'square') {
      ctx.fillStyle = color;
      ctx.fillRect(x + inset, y + inset, s, s);
    } else if (shape === 'circle') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + moduleSize / 2, y + moduleSize / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      fillShape(ctx, x + inset, y + inset, s, color, 'rounded');
    }
  };

  const drawFinder = (ctx, row, col, margin, moduleSize, dColor, bColor, shape, offsetY) => {
    const x = (col + margin) * moduleSize;
    const y = (row + margin) * moduleSize + offsetY;
    const outer = 7 * moduleSize;
    fillShape(ctx, x, y, outer, dColor, shape);
    const mid = moduleSize;
    fillShape(ctx, x + mid, y + mid, outer - 2 * mid, bColor, shape);
    const inOff = 2 * moduleSize, inner = 3 * moduleSize;
    fillShape(ctx, x + inOff, y + inOff, inner, dColor, shape);
  };

  const drawLogo = (ctx, logoCanvas, qrSize, offsetY, pct, bColor) => {
    const logoSize = qrSize * pct;
    const pad = logoSize * 0.18;
    const plate = logoSize + pad * 2;
    const px = (qrSize - plate) / 2;
    const py = offsetY + (qrSize - plate) / 2;

    ctx.save();
    roundRectPath(ctx, px, py, plate, plate, plate * 0.18);
    ctx.fillStyle = bColor;
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRectPath(ctx, px + pad, py + pad, logoSize, logoSize, logoSize * 0.18);
    ctx.clip();
    ctx.drawImage(logoCanvas, px + pad, py + pad, logoSize, logoSize);
    ctx.restore();
  };

  const drawBanner = (ctx, qrSize, bannerH, text, bannerBgColor, bannerTextColor, offsetY) => {
    const pillH = 50;
    ctx.save();
    ctx.font = "bold 22px ui-monospace, Menlo, Consolas, monospace";
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    
    // Calculate layout parameters
    const badgeSize = 32;
    const paddingLeft = 14;
    const gap = 12;
    const paddingRight = 24;
    const pillW = paddingLeft + badgeSize + gap + textW + paddingRight;
    
    const pillX = (qrSize - pillW) / 2;
    const pillY = offsetY + (bannerH - pillH) / 2;

    // Draw pill background
    roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = bannerBgColor;
    ctx.fill();
    
    // Draw pill border
    ctx.strokeStyle = bannerTextColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw yellow circle badge
    const badgeRadius = badgeSize / 2;
    const badgeCx = pillX + paddingLeft + badgeRadius;
    const badgeCy = pillY + pillH / 2;
    
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15'; // Vibrant yellow
    ctx.fill();

    // Draw phone receiver icon inside the yellow badge
    // SVG path for lucide phone (24x24 box)
    const phonePathStr = "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z";
    const phonePath = new Path2D(phonePathStr);
    
    const iconSize = 15;
    const iconScale = iconSize / 24;
    const iconX = badgeCx - iconSize / 2;
    const iconY = badgeCy - iconSize / 2;
    
    ctx.translate(iconX, iconY);
    ctx.scale(iconScale, iconScale);
    ctx.fillStyle = '#000000'; // Black phone icon
    ctx.fill(phonePath);
    ctx.restore();

    // Draw text next to the yellow badge
    ctx.save();
    ctx.fillStyle = bannerTextColor;
    ctx.font = "bold 20px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pillX + paddingLeft + badgeSize + gap, pillY + pillH / 2 + 1);
    ctx.restore();
  };

  const makeQR = (text) => {
    const levels = ['H', 'Q', 'M', 'L'];
    for (const lvl of levels) {
      for (let t = 0; t <= 40; t++) {
        try {
          const q = window.qrcode(t, lvl);
          q.addData(text);
          q.make();
          return { qr: q, level: lvl };
        } catch (e) {
          // try next
        }
      }
    }
    throw new Error('Text too long to encode as a QR code.');
  };

  const handleGenerateQR = async (urlOverride) => {
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

    // Draw dots
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (isFinderArea(row, col, moduleCount)) continue;
        if (qr.isDark(row, col)) {
          drawDot(ctx, row, col, margin, moduleSize, dotColor, dotShape, 0, dotSize / 100);
        }
      }
    }

    // Draw corners
    drawFinder(ctx, 0, 0, margin, moduleSize, dotColor, bgColor, cornerShape, 0);
    drawFinder(ctx, 0, moduleCount - 7, margin, moduleSize, dotColor, bgColor, cornerShape, 0);
    drawFinder(ctx, moduleCount - 7, 0, margin, moduleSize, dotColor, bgColor, cornerShape, 0);

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
    setOverlayDarkness(30);
    setShowLogoChip(false);
    setDotSize(60);
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
    setAdminSuccess("");
    setAdminError("");
  };

  // RENDER CUSTOMER FINDER OR LANDING PAGE
  if (isMainLanding) {
    const customerId = getUrlId();

    if (customerId) {
      if (customerLoading) {
        return (
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--accent-indigo)' }}></div>
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Locating owner details...</p>
          </div>
        );
      }

      if (customerError) {
        return (
          <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', alignSelf: 'center' }}>
            <main className="glass-panel card-content" style={{ maxWidth: '460px', width: '100%', margin: '0 auto', textAlign: 'center', padding: '40px 32px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.05)',
                border: '1px solid rgba(244, 63, 94, 0.15)',
                marginBottom: '16px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <AlertTriangle size={28} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Tag Error</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.95rem', lineHeight: '1.5' }}>{customerError}</p>
              
              <a
                href="/"
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Go to Homepage
              </a>
            </main>
          </div>
        );
      }

      if (customerData) {
        const isUnregistered = customerData.status === 'unregistered';

        if (isUnregistered) {
          // 1. UNREGISTERED REGISTRATION VIEW
          return (
            <div className="app-container" style={{ maxWidth: '520px', alignSelf: 'center' }}>
              <main className="glass-panel card-content" style={{ padding: '36px 28px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <img src="/full logo.png" alt="I'm here" style={{ width: '160px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 40%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    You're the first one to scan me! Claim me!
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', lineHeight: '1.5' }}>
                    This physical tag is unclaimed and waiting for you. Claim me first to link your contact details, set up your profile, and make sure your gear is always connected to you!
                  </p>
                </div>

                <div className="status-msg status-msg-error" style={{ fontSize: '0.8rem', padding: '10px 14px', marginBottom: '20px', borderStyle: 'dashed' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    ⚠️ Keep it clean: Anyone who scans this physical tag will see the digital secrets you drop below.
                  </span>
                </div>

                <form onSubmit={handleSaveRegistration} className="form-group" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="regNameInput" className="form-label" style={{ fontSize: '0.72rem' }}>Name (Optional)</label>
                    <div className="input-wrapper">
                      <User className="input-icon" size={18} />
                      <input
                        id="regNameInput"
                        type="text"
                        className="text-input"
                        placeholder="e.g. Nikhil P."
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={savingReg}
                        style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="regNumberInput" className="form-label" style={{ fontSize: '0.72rem' }}>Phone Number (Required)</label>
                    <div className="input-wrapper">
                      <Phone className="input-icon" size={18} />
                      <input
                        id="regNumberInput"
                        type="tel"
                        className="text-input"
                        placeholder="10-digit mobile number"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        disabled={savingReg}
                        style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="regPasswordInput" className="form-label" style={{ fontSize: '0.72rem' }}>Password (Remember it so in case you want to change your details in the future - Required)</label>
                    <div className="input-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        id="regPasswordInput"
                        type="password"
                        className="text-input"
                        placeholder="Password to update details later"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={savingReg}
                        style={{ padding: '12px 14px 12px 42px', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  {/* Dynamic socials wrapper */}
                  <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="form-label" style={{ fontSize: '0.72rem', margin: 0 }}>Where else can I find you? (Optional Contacts)</span>
                      <button
                        type="button"
                        onClick={handleAddSocial}
                        className="btn"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', borderRadius: '6px' }}
                        disabled={savingReg}
                      >
                        <Plus size={12} />
                        Add Option
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {socials.map((social, idx) => (
                        <div key={idx} className="social-input-row">
                          <div className="social-dropdown-wrapper">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setOpenDropdownIdx(openDropdownIdx === idx ? null : idx); }}
                              disabled={savingReg}
                              className="social-dropdown-btn"
                            >
                              <span>{social.type}</span>
                              <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: '6px' }}>▼</span>
                            </button>

                            {openDropdownIdx === idx && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  marginTop: '6px',
                                  background: '#0f172a',
                                  border: '1px solid var(--border-light)',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                                  zIndex: 50,
                                  overflow: 'hidden'
                                }}
                              >
                                {['Email', 'LinkedIn', 'GitHub', 'Instagram', 'Custom Link'].map((option) => (
                                  <div
                                    key={option}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSocialFieldChange(idx, 'type', option);
                                      setOpenDropdownIdx(null);
                                    }}
                                    style={{
                                      padding: '10px 12px',
                                      fontSize: '0.8rem',
                                      cursor: 'pointer',
                                      color: social.type === option ? 'var(--accent-cyan)' : 'var(--text-primary)',
                                      background: social.type === option ? 'rgba(255,255,255,0.04)' : 'transparent',
                                      transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={(e) => e.target.style.background = social.type === option ? 'rgba(255,255,255,0.04)' : 'transparent'}
                                  >
                                    {option}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {social.type === 'Custom Link' && (
                            <input
                              type="text"
                              placeholder="Title (e.g. YouTube)"
                              value={social.label}
                              onChange={(e) => handleSocialFieldChange(idx, 'label', e.target.value)}
                              className="social-title-input"
                              disabled={savingReg}
                            />
                          )}

                          <input
                            type={social.type === 'Email' ? 'email' : 'text'}
                            placeholder={social.type === 'Email' ? 'owner@mail.com' : 'profile link or username'}
                            value={social.value}
                            onChange={(e) => handleSocialFieldChange(idx, 'value', e.target.value)}
                            className="social-value-input"
                            disabled={savingReg}
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveSocial(idx)}
                            className="btn btn-danger-outline social-delete-btn"
                            disabled={savingReg}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {regError && (
                    <div className="status-msg status-msg-error" style={{ fontSize: '0.85rem' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <span>{regError}</span>
                    </div>
                  )}

                  {regSuccess && (
                    <div className="status-msg status-msg-success" style={{ fontSize: '0.85rem' }}>
                      <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                      <span>{regSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingReg || regSuccess}
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    {savingReg ? (
                      <>
                        <div className="spinner"></div>
                        Claiming tag...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={20} />
                        Claim me! 💖
                      </>
                    )}
                  </button>
                </form>
              </main>
            </div>
          );
        } else {
          // 2. REGISTERED DETAILS VIEW
          return (
            <div className="app-container" style={{ maxWidth: '480px', alignSelf: 'center' }}>
              <main className="glass-panel card-content" style={{ padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ marginBottom: '24px' }}>
                  <img src="/full logo.png" alt="I'm here" style={{ width: '160px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Hey there! Looking for me? 👀</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
                    You just scanned a piece of my physical world. Want to get in touch, return a lost item, or just see what I’m up to? Here’s my digital space:
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  {/* Name field (if exists) */}
                  {customerData.name && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 18px' }}>
                      <span className="form-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Owner Name</span>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>{customerData.name}</span>
                    </div>
                  )}

                  {/* Phone number card */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '14px 18px' }}>
                    <span className="form-label" style={{ fontSize: '0.65rem', display: 'block', marginBottom: '4px' }}>Primary Phone</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                        {customerData.number.replace(/(\d{5})(\d{5})/, '$1-$2')}
                      </span>
                      <a
                        href={`tel:${customerData.number}`}
                        className="btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, var(--accent-indigo) 0%, var(--accent-purple) 100%)',
                          color: 'white',
                          borderRadius: '6px',
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={12} />
                        Say Hey! 📞
                      </a>
                    </div>
                  </div>

                  {/* Social links (if any exist) */}
                  {customerData.socials && customerData.socials.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <span className="form-label" style={{ fontSize: '0.68rem', display: 'block', marginBottom: '10px' }}>Find me online ✨</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customerData.socials.map((social, idx) => {
                          const isEmail = social.type === 'Email';
                          const linkHref = isEmail ? `mailto:${social.value}` : social.value;

                          return (
                            <a
                              key={idx}
                              href={linkHref}
                              target={isEmail ? '_self' : '_blank'}
                              rel="noopener noreferrer"
                              style={{
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'stretch',
                                gap: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-light)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                color: 'var(--text-primary)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.borderColor = 'var(--border-light)';
                              }}
                            >
                              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                                <BrandIcon type={social.type} size={18} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                  {social.label}
                                </span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', color: 'var(--accent-cyan)' }}>
                                  {social.value}
                                </span>
                              </div>
                              <ExternalLink size={14} style={{ opacity: 0.4 }} />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                  😊 Thanks for scanning! Be a sweetheart and let me know if you found my item. 😉
                </div>
              </main>
            </div>
          );
        }
      }
    }

    // Default main landing page (no ID query parameter)
    return (
      <div className="app-container" style={{ maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', gap: '32px', alignSelf: 'center' }}>
        <header className="header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Logo with glow effect */}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '-15px',
              right: '-15px',
              bottom: '-15px',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, transparent 70%)',
              borderRadius: '24px',
              filter: 'blur(16px)',
              zIndex: -1
            }} />
            <img 
              src="/full logo.png" 
              alt="I'm here Logo" 
              style={{ 
                width: '180px', 
                height: 'auto', 
                borderRadius: '16px', 
                boxShadow: '0 12px 36px rgba(0,0,0,0.65)', 
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
              }} 
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.06) rotate(1deg)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1) rotate(0deg)'}
            />
          </div>
          
          <h1 style={{ fontSize: '3.6rem', fontWeight: 900, background: 'linear-gradient(135deg, #ffffff 20%, #a5b4fc 60%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            Smart QR Item Tags
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '540px', lineHeight: '1.6', margin: '0 auto' }}>
            Securely connect your physical belongings to your digital space. No apps to download. Just scan, claim, and protect your items.
          </p>
        </header>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '24px', marginBottom: '-8px', background: 'linear-gradient(135deg, #ffffff 40%, #f43f5e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Problem
        </h2>

        {/* Problem Section */}
        <div className="problem-grid">
          {/* Problem Card 1 */}
          <div className="glass-panel" style={{ 
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
            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '340px', background: 'rgba(0,0,0,0.2)' }}>
              <img 
                src="/problem s1.png" 
                alt="Lost items situation" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <div>
              <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
                Lost belongings are a common part of everyday life. From forgotten keys to misplaced bags, small mistakes can quickly become frustrating problems.
              </p>
            </div>
          </div>

          {/* Problem Card 2 */}
          <div className="glass-panel" style={{ 
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
            <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', height: '340px', background: 'rgba(0,0,0,0.2)' }}>
              <img 
                src="/problem s2.png" 
                alt="Helpful finder situation" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <div>
              <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 500, lineHeight: '1.6', margin: 0, textAlign: 'justify' }}>
                Many people notice lost belongings and genuinely want to help, but with no way to identify or contact the owner, they simply leave them where they found them.
              </p>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '32px', marginBottom: '-8px', background: 'linear-gradient(135deg, #ffffff 40%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Solution
        </h2>

        {/* Feature Cards Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '20px', 
          width: '100%', 
          marginTop: '20px' 
        }}>
          {/* Card 1 */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', marginBottom: '16px' }}>
              <Sparkles size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Design Branded QRs</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Create stunning, high-contrast QR codes matching your personal style with custom colors, frame text, and photo backgrounds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
              <Lock size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Scan & Claim Tag</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Unregistered physical tags can be instantly claimed by finders or owners. Secure details with your personal password.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', textAlign: 'left', transition: 'all 0.3s ease' }}
               onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}>
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', marginBottom: '16px' }}>
              <Globe size={20} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Unified Find Card</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Displays clean, glassmorphic owner profile cards with phone triggers and secure socials to get returned items back home.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <footer style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
          © 2026 I'm here QR Tagging System. Powered by Firestore & Vite.
        </footer>
      </div>
    );
  }

  // RENDER PASSWORD PROMPT (UNAUTHENTICATED ADMIN)
  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', minHeight: '80vh', alignSelf: 'center' }}>
        <main className="glass-panel card-content" style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img src="/full logo.png" alt="I'm here" style={{ width: '120px', height: 'auto', borderRadius: '12px', marginBottom: '12px' }} />
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

  // RENDER ADMIN PANEL (AUTHENTICATED - SPLIT SCREEN COCKPIT)
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
            onClick={handleLogout}
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

                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px solid var(--accent-rose)',
                    color: 'var(--accent-rose)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={18} />
                  DOWNLOAD PNG
                </button>

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
    </div>
  );
}

export default App;
