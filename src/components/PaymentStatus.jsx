import { CheckCircle, XCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import './PaymentStatus.css';

export default function PaymentStatus() {
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status');
  const orderId = params.get('orderId');
  const amount = params.get('amount');
  const error = params.get('error');

  const handleGoHome = () => {
    window.location.href = '/orders';
  };

  return (
    <div className="payment-status-container">
      <div className="payment-glow-bg" />
      <div className="payment-status-card glass-panel animate-fade-in">
        {status === 'success' ? (
          <div className="status-content success">
            <div className="status-icon-wrapper success-glow">
              <CheckCircle className="status-icon text-success" size={64} />
            </div>
            
            <h1 className="status-title">Order Placed Successfully!</h1>
            <p className="status-subtitle">
              Thank you for your purchase. Your payment has been processed securely.
            </p>

            <div className="details-box">
              <div className="detail-row">
                <span className="detail-label">Order ID</span>
                <span className="detail-val font-mono">{orderId || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Amount Paid</span>
                <span className="detail-val amount-highlight">₹{amount || '0.00'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Status</span>
                <span className="detail-val badge success">SUCCESS</span>
              </div>
            </div>

            <p className="status-footer-note">
              We are preparing your I'm Here QR keychains. You will receive shipping updates shortly.
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
