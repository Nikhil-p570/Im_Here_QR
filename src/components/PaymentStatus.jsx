import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { initializeFirebase } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './PaymentStatus.css';

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

  // For online payment success: update Firestore order status to 'orderplaced'
  useEffect(() => {
    if (status !== 'success' || mode === 'cod' || !fsOrderId) return;
    if (orderUpdated) return;

    const updateOrderStatus = async () => {
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
          await updateDoc(doc(db, 'orders', fsOrderId), {
            orderStatus: 'orderplaced',
            zaakpayOrderId: orderId || ''
          });
          setOrderUpdated(true);
        }
      } catch (err) {
        console.warn('Order status update failed:', err);
      }
    };

    updateOrderStatus();
  }, [status, mode, fsOrderId, orderId]);

  const handleGoHome = () => {
    window.location.href = '/orders';
  };

  const isCod = mode === 'cod';

  return (
    <div className="payment-status-container">
      <div className="payment-glow-bg" />
      <div className="payment-status-card glass-panel animate-fade-in">
        {status === 'success' ? (
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
