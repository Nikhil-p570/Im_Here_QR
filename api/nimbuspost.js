/* global process */
import fs from 'fs';
import path from 'path';

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
    console.error("Error reading fallback local env in nimbuspost:", err);
  }
  return '';
};

// Global cache for the bearer token to avoid logging in on every request
let tokenCache = {
  token: null,
  expiry: 0
};

// Helper: login and return bearer token
async function getNimbusToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiry > now) {
    return tokenCache.token;
  }

  const email = getEnv('NIMBUSPOST_EMAIL') || 'tech@nimbuspost.com'; // Default placeholder, user must configure it
  const password = getEnv('NIMBUSPOST_PASSWORD') || '123456'; 

  const res = await fetch('https://api.nimbuspost.com/v1/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || 'NimbusPost Login failed');
  }

  tokenCache = {
    token: data.data,
    expiry: now + 3600 * 1000 // Cache for 1 hour
  };

  return tokenCache.token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, payload } = req.body;

  try {
    // 1. Authenticate with NimbusPost
    const token = await getNimbusToken();

    // 2. Route based on action
    if (action === 'create_shipment') {
      const pickupDetails = {
        warehouse_name: getEnv('NIMBUSPOST_WAREHOUSE_NAME') || 'Main Warehouse',
        name: getEnv('NIMBUSPOST_PICKUP_NAME') || 'Nikhil',
        address: getEnv('NIMBUSPOST_PICKUP_ADDRESS') || '140, MG Road',
        address_2: getEnv('NIMBUSPOST_PICKUP_ADDRESS_2') || '',
        city: getEnv('NIMBUSPOST_PICKUP_CITY') || 'Gurgaon',
        state: getEnv('NIMBUSPOST_PICKUP_STATE') || 'Haryana',
        pincode: getEnv('NIMBUSPOST_PICKUP_PINCODE') || '122001',
        phone: getEnv('NIMBUSPOST_PICKUP_PHONE') || '9999999999'
      };

      const requestBody = {
        order_number: payload.orderNumber,
        shipping_charges: 0,
        discount: 0,
        cod_charges: 0,
        payment_type: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
        order_amount: payload.totalAmount,
        package_weight: payload.packageWeight || 100, // in grams
        package_length: payload.packageLength || 10,  // in cm
        package_breadth: payload.packageBreadth || 10,
        package_height: payload.packageHeight || 10,
        request_auto_pickup: 'no', // Keep as 'no' so delivery guy doesn't come immediately
        consignee: {
          name: payload.shippingAddress.name || payload.customerName,
          address: payload.shippingAddress.address,
          address_2: payload.shippingAddress.address_2 || '',
          city: payload.shippingAddress.city,
          state: payload.shippingAddress.state,
          pincode: payload.shippingAddress.pincode,
          phone: payload.orderedPhoneNumber || payload.shippingAddress.phone || '9999999999'
        },
        pickup: pickupDetails,
        order_items: (payload.items || []).map(item => ({
          name: item.typeofqr === 'personalised' ? 'Personalised QR Keychain' : 'Classic QR Keychain',
          qty: String(item.quantity || 1),
          price: String(item.unitPrice || 0),
          sku: item.typeofqr || 'keychain'
        })),
        courier_id: 'autoship', // Let NimbusPost recommend the cheapest partner automatically
        is_insurance: '0',
        tags: 'keychain'
      };

      const nimbusRes = await fetch('https://api.nimbuspost.com/v1/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderId: nimbusData.data.order_id,
          shipmentId: nimbusData.data.shipment_id,
          awbNumber: nimbusData.data.awb_number,
          courierName: nimbusData.data.courier_name,
          labelUrl: nimbusData.data.label
        }
      });

    } else if (action === 'cancel_shipment') {
      const nimbusRes = await fetch('https://api.nimbuspost.com/v1/shipments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ awb: payload.awbNumber })
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message });
      }

      return res.status(200).json({ success: true, message: 'Shipment cancelled successfully' });

    } else if (action === 'manifest') {
      const nimbusRes = await fetch('https://api.nimbuspost.com/v1/shipments/manifest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ awbs: payload.awbNumbers })
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message });
      }

      return res.status(200).json({
        success: true,
        manifestUrl: nimbusData.data
      });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (err) {
    console.error('NimbusPost Backend Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
