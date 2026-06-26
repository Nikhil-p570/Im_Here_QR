/* global process */
import fs from 'fs';
import path from 'path';

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
      // 1. Secure Validation: Fetch order from database and verify amount paid
      const db = getFirebaseDb();
      const orderDocRef = doc(db, 'orders', fsOrderId);
      const orderDocSnap = await getDoc(orderDocRef);

      if (!orderDocSnap.exists()) {
        throw new Error('Order not found in database.');
      }

      const orderData = orderDocSnap.data();
      const dbAmount = parseFloat(orderData.totalAmount);
      const paidAmount = parseFloat(data.order_amount);

      // Check for price tampering
      if (Math.abs(dbAmount - paidAmount) > 0.01) {
        throw new Error('Security Alert: Paid amount does not match the database order amount.');
      }

      // 2. Secure Update: Mark order as placed directly on the server
      await updateDoc(orderDocRef, {
        orderStatus: 'orderplaced',
        cashfreeOrderId: orderId
      });

      redirectUrl = `${protocol}://${host}/payment-status?status=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(paidAmount)}${fsOrderId ? `&fsOrderId=${encodeURIComponent(fsOrderId)}` : ''}`;
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
