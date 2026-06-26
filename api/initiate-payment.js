/* global process */
import fs from 'fs';
import path from 'path';

import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    console.error("Error reading fallback local env in initiate-payment API:", err);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      amount,
      buyerEmail,
      buyerPhoneNumber,
      buyerFirstName,
      buyerLastName,
      firestoreOrderId
    } = req.body;

    // Validation
    if (!amount || !buyerEmail || !buyerPhoneNumber || !firestoreOrderId) {
      return res.status(400).json({ error: 'Missing required parameters: amount, buyerEmail, buyerPhoneNumber, and firestoreOrderId are required.' });
    }

    // Secure Verification: Fetch the order from Firestore and verify the amount
    const db = getFirebaseDb();
    const orderDocRef = doc(db, 'orders', firestoreOrderId);
    const orderDocSnap = await getDoc(orderDocRef);

    if (!orderDocSnap.exists()) {
      return res.status(404).json({ error: 'Order not found in database.' });
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
    if (Array.isArray(orderData.items)) {
      for (const item of orderData.items) {
        const qty = parseInt(item.quantity) || 0;
        const isPersonalised = item.typeofqr === 'personalised';
        const officialUnitPrice = isPersonalised ? officialPersonalised : officialClassic;
        expectedTotal += qty * officialUnitPrice;
      }
    }

    const clientTotal = parseFloat(amount);
    
    // Check if price or quantity totals were tampered with
    if (Math.abs(expectedTotal - clientTotal) > 0.01 || Math.abs(parseFloat(orderData.totalAmount) - expectedTotal) > 0.01) {
      return res.status(400).json({ error: 'Security alert: Order amount or quantity tampering detected.' });
    }

    // Cashfree Credentials
    const appId = getEnv('CASHFREE_APP_ID') || 'YOUR_CASHFREE_APP_ID_PLACEHOLDER';
    const secretKey = getEnv('CASHFREE_SECRET_KEY') || 'YOUR_CASHFREE_SECRET_KEY_PLACEHOLDER';
    const environment = getEnv('CASHFREE_ENVIRONMENT') || 'sandbox'; // 'sandbox' or 'production'

    // Generate unique order ID
    const orderId = `IMHERE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    
    // Redirect return URL back to our verification handler
    const returnUrl = `${protocol}://${host}/api/payment-response?order_id={order_id}&fsOrderId=${firestoreOrderId}&amount=${amount}`;

    const requestBody = {
      order_amount: parseFloat(amount),
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: buyerPhoneNumber.replace(/[^a-zA-Z0-9]/g, '') || `cust_${Date.now()}`,
        customer_phone: buyerPhoneNumber.trim(),
        customer_email: buyerEmail.trim(),
        customer_name: `${buyerFirstName} ${buyerLastName}`.trim() || 'Customer'
      },
      order_meta: {
        return_url: returnUrl
      }
    };

    const gatewayUrl = environment === 'production'
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const cfRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await cfRes.json();

    if (!cfRes.ok) {
      throw new Error(data.message || `Cashfree API returned HTTP ${cfRes.status}`);
    }

    const paymentSessionId = data.payment_session_id || '';
    const paymentLink = paymentSessionId
      ? (environment === 'production'
          ? `https://payments.cashfree.com/pg/view/checkout?session_id=${paymentSessionId}`
          : `https://sandbox.cashfree.com/pg/view/checkout?session_id=${paymentSessionId}`)
      : '';

    return res.status(200).json({
      success: true,
      paymentSessionId,
      paymentLink,
      orderId,
      environment
    });

  } catch (error) {
    console.error("Payment initiation failed:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
