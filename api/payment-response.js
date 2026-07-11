/* global process */
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// Helper to load dotenv keys locally if not defined in process.env (for local dev testing)
const getEnv = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const [k, ...v] = line.split('=');
        if (k.trim() === key) {
          return v.join('=').trim();
        }
      }
    }
  } catch (err) {
    console.error("Error reading fallback local env in payment-response API:", err);
  }
  return '';
};

// Initialize Firebase
const getFirebaseDb = () => {
  const config = {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID'),
    measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
  };

  if (!config.apiKey) {
    throw new Error("Missing Firebase configuration env variables.");
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  return getFirestore(app);
};

export default async function handler(req, res) {
  // Cashfree redirects user back to return_url via GET request
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const orderId = req.query.order_id || 'UNKNOWN';
    const fsOrderId = req.query.fsOrderId || '';
    const amount = req.query.amount || '0.00';

    // Cashfree Credentials
    const appId = getEnv('CASHFREE_APP_ID') || 'YOUR_CASHFREE_APP_ID_PLACEHOLDER';
    const secretKey = getEnv('CASHFREE_SECRET_KEY') || 'YOUR_CASHFREE_SECRET_KEY_PLACEHOLDER';
    const environment = getEnv('CASHFREE_ENVIRONMENT') || 'sandbox'; // 'sandbox' or 'production'

    const gatewayUrl = environment === 'production'
      ? `https://api.cashfree.com/pg/orders/${orderId}`
      : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    // Verify payment status with Cashfree GET Order API
    const cfRes = await fetch(gatewayUrl, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      }
    });

    const data = await cfRes.json();

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;

    let redirectUrl;

    if (cfRes.ok && data.order_status === 'PAID') {
      try {
        // 1. Secure Validation: Fetch order from database and verify amount paid
        const db = getFirebaseDb();
        const orderDocRef = doc(db, 'orders', fsOrderId);
        const orderDocSnap = await getDoc(orderDocRef);

        if (!orderDocSnap.exists()) {
          throw new Error('Order not found in database.');
        }

        const orderData = orderDocSnap.data();

        // Fetch official prices from database or use defaults
        let officialPersonalised = 199;
        let officialClassic = 129;
        try {
          const pricesDocRef = doc(db, 'settings', 'prices');
          const pricesSnap = await getDoc(pricesDocRef);
          if (pricesSnap.exists()) {
            const pricesData = pricesSnap.data();
            if (pricesData.personalisedDiscounted !== undefined) {
              officialPersonalised = parseFloat(pricesData.personalisedDiscounted);
            }
            if (pricesData.classicDiscounted !== undefined) {
              officialClassic = parseFloat(pricesData.classicDiscounted);
            }
          }
        } catch (err) {
          console.warn("Failed to fetch official prices, using fallback constants:", err);
        }

        // Re-calculate the expected total amount securely
        let expectedTotal = 0;
        let personalisedCount = 0;
        if (Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            const qty = parseInt(item.quantity) || 0;
            const isPersonalised = item.typeofqr === 'personalised';
            const officialUnitPrice = isPersonalised ? officialPersonalised : officialClassic;
            if (isPersonalised) personalisedCount += qty;
            expectedTotal += qty * officialUnitPrice;
          }
        }

        // Apply coupon discount securely
        let couponDiscount = 0;
        const appliedCoupon = orderData.appliedCoupon || '';
        if (appliedCoupon === 'BUY2GET1' && personalisedCount >= 3) {
          couponDiscount = 199;
        } else if (appliedCoupon === 'BUY3GET2' && personalisedCount >= 5) {
          couponDiscount = 398;
        } else if (appliedCoupon === 'STARTUP' && personalisedCount >= 1) {
          couponDiscount = personalisedCount * 30;
        }

        expectedTotal -= couponDiscount;

        const dbAmount = parseFloat(orderData.totalAmount);
        const paidAmount = parseFloat(data.order_amount);

        // Check for price or quantity tampering at any step
        if (Math.abs(expectedTotal - paidAmount) > 0.01 || Math.abs(dbAmount - expectedTotal) > 0.01) {
          throw new Error('Security Alert: Paid amount or quantity does not match the computed order total.');
        }

        // 2. Secure Update: Mark order as placed directly on the server
        await updateDoc(orderDocRef, {
          orderStatus: 'orderplaced',
          cashfreeOrderId: orderId
        });

        // 3. Send Order Confirmation Email via Nodemailer
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: getEnv('GMAIL_USER'),
              pass: getEnv('GMAIL_APP_PASSWORD')
            }
          });

          // Fallback email determination
          const customerEmail = orderData.orderedEmail || orderData.email || 'nikhil.pabbisetti2006@gmail.com';

          const mailOptions = {
            from: `"I'm Here" <${getEnv('GMAIL_USER')}>`,
            to: customerEmail,
            subject: `Order Confirmed - I'm Here (Order #${orderId})`,
            html: `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #0f172a;">
                <img src="https://im-here-qr.vercel.app/full%20logo%20black.png" alt="I'm Here Logo" style="width: 140px; margin-bottom: 20px;" />
                
                <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 10px;">Thank You for Your Order!</h1>
                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                  Hi ${orderData.customerName || 'there'},<br/>
                  We have successfully received your payment of <strong>₹${paidAmount}</strong>.
                </p>
                
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #e2e8f0;">
                  <h2 style="font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 15px;">Order Details</h2>
                  <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderId}</p>
                  <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${paidAmount}</p>
                </div>

                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                  We are currently getting your premium tags ready! You will receive another update once they are shipped to your address.
                </p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                
                <p style="font-size: 14px; color: #64748b;">
                  In case of any support or queries, you can reach out to us at <a href="mailto:nikhil.pabbisetti2006@gmail.com" style="color: #4f46e5; font-weight: 600; text-decoration: none;">nikhil.pabbisetti2006@gmail.com</a>.
                </p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log("Confirmation email sent successfully to:", customerEmail);
        } catch (emailErr) {
          console.error("Failed to send confirmation email:", emailErr);
        }

        redirectUrl = `${protocol}://${host}/payment-status?status=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(paidAmount)}${fsOrderId ? `&fsOrderId=${encodeURIComponent(fsOrderId)}` : ''}`;
      } catch (validationError) {
        console.error("Order Validation Failed. Initiating Auto-Refund:", validationError);
        
        // Auto Refund API Call
        const refundUrl = environment === 'production'
          ? `https://api.cashfree.com/pg/orders/${orderId}/refunds`
          : `https://sandbox.cashfree.com/pg/orders/${orderId}/refunds`;
          
        try {
          const refundRes = await fetch(refundUrl, {
            method: 'POST',
            headers: {
              'x-client-id': appId,
              'x-client-secret': secretKey,
              'x-api-version': '2023-08-01',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              refund_amount: parseFloat(data.order_amount),
              refund_id: `REF_${orderId}_${Date.now()}`,
              refund_note: "Validation Failed: Auto-Refunded by system"
            })
          });
          const refundData = await refundRes.json();
          console.log("Auto-Refund Response:", refundData);
        } catch (refundErr) {
          console.error("Auto-Refund API Request Failed:", refundErr);
        }

        // Send Auto-Refund/Failure Email via Nodemailer
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: getEnv('GMAIL_USER'),
              pass: getEnv('GMAIL_APP_PASSWORD')
            }
          });

          // Re-fetch email or order details if not defined in this scope
          const customerEmail = data.customer_details?.customer_email || 'nikhil.pabbisetti2006@gmail.com';
          const customerName = data.customer_details?.customer_name || 'Customer';

          const mailOptions = {
            from: `"I'm Here" <${getEnv('GMAIL_USER')}>`,
            to: customerEmail,
            subject: `Payment Issue & Auto-Refund Initiated - I'm Here`,
            html: `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #0f172a;">
                <img src="https://im-here-qr.vercel.app/full%20logo%20black.png" alt="I'm Here Logo" style="width: 140px; margin-bottom: 20px;" />
                
                <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 10px; color: #e11d48;">Payment Validation Failed</h1>
                <p style="font-size: 16px; color: #475569; line-height: 1.6;">
                  Hi ${customerName},<br/>
                  We noticed there was an issue verifying your order (Order #${orderId}). Don't worry! If your amount of <strong>₹${parseFloat(data.order_amount)}</strong> was deducted, our system has successfully initiated an automatic refund.
                </p>
                
                <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin: 30px 0; border: 1px solid #fecaca; text-align: left;">
                  <h2 style="font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #b91c1c; margin-bottom: 10px; text-align: center;">Refund Details</h2>
                  <ul style="font-size: 15px; color: #7f1d1d; line-height: 1.6; margin: 0; padding-left: 20px;">
                    <li><strong>Amount:</strong> ₹${parseFloat(data.order_amount)}</li>
                    <li><strong>Timeline:</strong> It usually takes 5-7 business days for the refund to reflect back in your original payment method depending on your bank.</li>
                  </ul>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                
                <p style="font-size: 14px; color: #64748b;">
                  In case of any support or queries, you can reach out to us at <a href="mailto:nikhil.pabbisetti2006@gmail.com" style="color: #4f46e5; font-weight: 600; text-decoration: none;">nikhil.pabbisetti2006@gmail.com</a>.
                </p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          console.log("Auto-refund email sent successfully to:", customerEmail);
        } catch (emailErr) {
          console.error("Failed to send auto-refund email:", emailErr);
        }

        // Redirect to failure page with a specific error message so user knows they were refunded
        redirectUrl = `${protocol}://${host}/payment-status?status=failure&orderId=${encodeURIComponent(orderId)}&error=security_mismatch_refunded`;
      }
    } else {
      const errorMsg = data.order_status || 'Payment Failed';
      redirectUrl = `${protocol}://${host}/payment-status?status=failure&orderId=${encodeURIComponent(orderId)}&error=${encodeURIComponent(errorMsg)}`;
    }

    // Redirect to the frontend status page
    res.writeHead(302, { Location: redirectUrl });
    return res.end();

  } catch (error) {
    console.error("Payment response processing failed:", error);
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    res.writeHead(302, { Location: `${protocol}://${host}/payment-status?status=failure&error=internal_server_error` });
    return res.end();
  }
}
