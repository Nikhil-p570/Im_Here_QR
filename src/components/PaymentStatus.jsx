import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { initializeFirebase } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './PaymentStatus.css';

const uploadImageToCloudinary = async (base64Str, fsOrderId, itemIdx) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    console.warn('Cloudinary config missing — skipping image upload');
    return { url: '', publicId: '' };
  }

  try {
    const formData = new FormData();
    formData.append('file', base64Str);
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

export default function PaymentStatus() {
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const orderId = params.get('orderId');
  const amount = params.get('amount');
  const error = params.get('error');
  const mode = params.get('mode'); // 'cod' | null (online)
  const fsOrderId = params.get('fsOrderId'); // Firestore order doc ID (for online payment)

  const [orderUpdated, setOrderUpdated] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(
    status === 'success' ? (mode === 'cod' ? 'success' : 'verifying') : 'failure'
  );
  const hasRun = useRef(false);

  // For online payment success: verify and clean up Firestore order items
  useEffect(() => {
    if (status !== 'success' || !fsOrderId) return;
    if (orderUpdated) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const verifyAndUpdateOrder = async () => {
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
          const docRef = doc(db, 'orders', fsOrderId);
          
          // Poll/Retry up to 3 times to ensure the backend-triggered database update has completed
          let docSnap;
          let orderData;
          let attempts = 0;
          
          while (attempts < 3) {
            docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              orderData = docSnap.data();
              // If it's COD, it was already set to orderplaced. If Online, the backend must have verified and set it.
              if (orderData.orderStatus === 'orderplaced') {
                break;
              }
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          if (!docSnap.exists() || orderData.orderStatus !== 'orderplaced') {
            console.error("Order payment verification failed or status not updated by backend.");
            setVerificationStatus('failure');
            return;
          }

          setVerificationStatus('success');

          const updatedItems = [...(orderData.items || [])];
          let needsUpdate = false;

          // Loop items and upload tempBase64Image to Cloudinary
          for (let idx = 0; idx < updatedItems.length; idx++) {
            const item = updatedItems[idx];
            if (item.typeofqr === 'personalised' && item.tempBase64Image) {
              const uploadResult = await uploadImageToCloudinary(item.tempBase64Image, fsOrderId, idx);
              if (uploadResult.url) {
                item.imageUrl = uploadResult.url;
                item.cloudinaryPublicId = uploadResult.publicId;
                // Only delete the temp base64 field to save space if upload was successful
                delete item.tempBase64Image;
              }
              needsUpdate = true;
            }
          }

          const updatePayload = {};
          if (needsUpdate) {
            updatePayload.items = updatedItems;
            await updateDoc(docRef, updatePayload);
          }

          setOrderUpdated(true);
        }
      } catch (err) {
        console.warn('Order status update/verification failed:', err);
        if (mode !== 'cod') {
          setVerificationStatus('failure');
        }
      }
    };

    verifyAndUpdateOrder();
  }, [status, mode, fsOrderId, orderId, orderUpdated]);

  const handleGoHome = () => {
    window.location.href = '/orders';
  };

  const isCod = mode === 'cod';

  if (verificationStatus === 'verifying') {
    return (
      <div className="payment-status-container">
        <div className="payment-glow-bg" />
        <div className="payment-status-card glass-panel animate-fade-in" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="status-icon-wrapper success-glow" style={{ animation: 'spin 2s linear infinite', borderTopColor: '#ffdf00' }}>
            {/* Simple spinner using CSS keyframes */}
          </div>
          <h1 className="status-title" style={{ marginTop: '20px' }}>Verifying Payment...</h1>
          <p className="status-subtitle">Please wait while we confirm your payment transaction security.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-status-container">
      <div className="payment-glow-bg" />
      <div className="payment-status-card glass-panel animate-fade-in">
        {verificationStatus === 'success' ? (
          <div className="status-content success">
            <div className="status-icon-wrapper success-glow">
              {isCod
                ? <Truck className="status-icon text-success" size={64} />
                : <CheckCircle className="status-icon text-success" size={64} />
              }
            </div>
            
            <h1 className="status-title">
              {isCod ? 'Order Placed! (Cash on Delivery)' : 'Order Placed Successfully!'}
            </h1>
            <p className="status-subtitle">
              {isCod
                ? 'Your order has been confirmed. Please keep cash ready when your order arrives.'
                : 'Thank you for your purchase. Your payment has been processed securely.'
              }
            </p>

            <div className="details-box">
              <div className="detail-row">
                <span className="detail-label">Order ID</span>
                <span className="detail-val font-mono">{orderId || 'N/A'}</span>
              </div>
              {!isCod && (
                <div className="detail-row">
                  <span className="detail-label">Amount Paid</span>
                  <span className="detail-val amount-highlight">₹{amount || '0.00'}</span>
                </div>
              )}
              {isCod && (
                <div className="detail-row">
                  <span className="detail-label">Amount (COD)</span>
                  <span className="detail-val amount-highlight">₹{amount || '0.00'}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Payment Method</span>
                <span className="detail-val badge success">
                  {isCod ? 'CASH ON DELIVERY' : 'ONLINE PAYMENT'}
                </span>
              </div>
            </div>

            <p className="status-footer-note">
              {isCod
                ? "We are preparing your I'm Here QR keychains and will dispatch them soon. You'll pay on delivery."
                : "We are preparing your I'm Here QR keychains. You will receive shipping updates shortly."
              }
            </p>

            <button className="payment-status-btn btn-success" onClick={handleGoHome}>
              Order More Tags <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="status-content failure">
            <div className="status-icon-wrapper failure-glow">
              <XCircle className="status-icon text-danger" size={64} />
            </div>

            <h1 className="status-title">Payment Transaction Failed</h1>
            <p className="status-subtitle">
              We couldn't process your payment. Please try again or use another payment method.
            </p>

            <div className="details-box">
              {orderId && orderId !== 'UNKNOWN' && (
                <div className="detail-row">
                  <span className="detail-label">Order ID</span>
                  <span className="detail-val font-mono">{orderId}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Reason</span>
                <span className="detail-val text-danger-light">{error || 'Transaction declined by bank.'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-val badge failure">FAILED</span>
              </div>
            </div>

            <p className="status-footer-note">
              No money has been debited. If amount was cut, it will be refunded within 3-5 business days.
            </p>

            <button className="payment-status-btn btn-failure" onClick={handleGoHome}>
              <ShoppingBag size={16} /> Return to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
