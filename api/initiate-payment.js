/* global process */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

export default function handler(req, res) {
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
      buyerAddress,
      buyerCity,
      buyerState,
      buyerPincode,
      returnUrl: customReturnUrl
    } = req.body;

    // Validation
    if (!amount || !buyerEmail || !buyerPhoneNumber) {
      return res.status(400).json({ error: 'Missing required parameters: amount, buyerEmail, buyerPhoneNumber are required.' });
    }

    // Zaakpay Credentials (fill in later, or read from env)
    // Merchant ID and Secret Key placeholders can be replaced here
    const merchantId = getEnv('ZAAKPAY_MERCHANT_ID') || 'YOUR_ZAAKPAY_MERCHANT_ID_PLACEHOLDER';
    const secretKey = getEnv('ZAAKPAY_SECRET_KEY') || 'YOUR_ZAAKPAY_SECRET_KEY_PLACEHOLDER';
    const environment = getEnv('ZAAKPAY_ENVIRONMENT') || 'staging'; // 'staging' or 'production'

    // Generate unique order ID
    const orderId = `IMHERE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Convert amount to paisa (Indian rupee cents)
    const txnAmount = Math.round(parseFloat(amount) * 100);

    // Determine the base returnUrl
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const defaultReturnUrl = `${protocol}://${host}/api/payment-response`;
    const returnUrl = customReturnUrl || defaultReturnUrl;

    // Zaakpay Payment Request parameters
    const params = {
      merchantIdentifier: merchantId,
      orderId: orderId,
      returnUrl: returnUrl,
      txnAmount: String(txnAmount),
      currency: 'INR',
      txnType: '1',
      zpPayToDirectory: '0',
      buyerEmail: buyerEmail,
      buyerPhoneNumber: buyerPhoneNumber,
      buyerFirstName: buyerFirstName || '',
      buyerLastName: buyerLastName || '',
      buyerAddress: buyerAddress || '',
      buyerCity: buyerCity || '',
      buyerState: buyerState || '',
      buyerCountry: 'India',
      buyerPincode: buyerPincode || ''
    };

    // Calculate Checksum: sort parameters alphabetically by key, join with '&', and sign with secret key via HMAC-SHA256
    const sortedKeys = Object.keys(params).sort();
    const dataString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
    
    // Generate Checksum
    const checksum = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    // Attach checksum to response parameters
    const responseParams = {
      ...params,
      checksum
    };

    // Determine gateway handler endpoint
    const gatewayUrl = environment === 'production'
      ? 'https://api.zaakpay.com/api/paymentTransact/handler'
      : 'https://sandbox.zaakpay.com/api/paymentTransact/handler';

    return res.status(200).json({
      success: true,
      gatewayUrl,
      params: responseParams,
      orderId
    });

  } catch (error) {
    console.error("Payment initiation failed:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
