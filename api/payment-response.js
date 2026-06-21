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
    console.error("Error reading fallback local env in payment-response API:", err);
  }
  return '';
};

export default function handler(req, res) {
  // Zaakpay returns response as POST request
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const params = { ...req.body };
    const receivedChecksum = params.checksum;
    delete params.checksum;

    const secretKey = getEnv('ZAAKPAY_SECRET_KEY') || 'YOUR_ZAAKPAY_SECRET_KEY_PLACEHOLDER';

    // Calculate expected Checksum
    const sortedKeys = Object.keys(params).sort();
    const dataString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    const expectedChecksum = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    const isAuthentic = (receivedChecksum === expectedChecksum);
    
    // Determine success (responseCode '100' is payment success in Zaakpay)
    const isSuccess = isAuthentic && (params.responseCode === '100');
    const orderId = params.orderId || 'UNKNOWN';
    const amount = params.amount ? (parseFloat(params.amount) / 100).toFixed(2) : '0.00';
    const firestoreOrderId = params.firestoreOrderId || '';

    // Redirect user back to frontend page
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    
    let redirectUrl;
    if (isSuccess) {
      redirectUrl = `${protocol}://${host}/payment-status?status=success&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}${firestoreOrderId ? `&fsOrderId=${encodeURIComponent(firestoreOrderId)}` : ''}`;
    } else {
      const errorMsg = !isAuthentic ? 'Checksum Verification Failed' : (params.responseDescription || 'Payment Failed');
      redirectUrl = `${protocol}://${host}/payment-status?status=failure&orderId=${encodeURIComponent(orderId)}&error=${encodeURIComponent(errorMsg)}`;
    }

    // Set 302 Redirect Header
    res.writeHead(302, { Location: redirectUrl });
    return res.end();

  } catch (error) {
    console.error("Payment response processing failed:", error);
    // Fallback redirect to failure route
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    res.writeHead(302, { Location: `${protocol}://${host}/payment-status?status=failure&error=internal_server_error` });
    return res.end();
  }
}
