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

// Helper: login and return bearer token (Using B2C Login Endpoint)
async function getNimbusToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiry > now) {
    return tokenCache.token;
  }

  const email = getEnv('NIMBUSPOST_EMAIL') || 'tech@nimbuspost.com';
  const password = getEnv('NIMBUSPOST_PASSWORD') || '123456'; 

  const res = await fetch('https://ship.nimbuspost.com/api/users/login', {
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
    // 2. Route based on action
    if (action === 'wallet_balance') {
      const token = await getNimbusToken();
      // Wallet Balance API (Shared wallet can be queried via shipmentcargo endpoint using Bearer token)
      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/shipmentcargo/wallet_balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message });
      }

      // B2C/B2B returns wallet_balance or available_limit
      let balance = 0;
      if (typeof nimbusData.data === 'object' && nimbusData.data !== null) {
        balance = parseFloat(nimbusData.data.available_limit || nimbusData.data.wallet_balance || 0);
      } else {
        balance = parseFloat(nimbusData.data || 0);
      }

      return res.status(200).json({
        success: true,
        walletBalance: balance
      });

    } else if (action === 'calculate_rates') {
      const token = await getNimbusToken();
      // B2C Serviceability / Rate Calculator API using Bearer token
      const pickupPincode = getEnv('NIMBUSPOST_PICKUP_PINCODE') || '122001';
      const destinationPincode = payload.destinationPincode;
      const orderValue = payload.totalAmount || 100;
      const totalQty = payload.totalQty || 1;

      // 30g per keychain, weight in grams as integer
      const weight = Math.max(30, Math.round(totalQty * 30));

      const requestBody = {
        origin: pickupPincode,
        destination: destinationPincode,
        payment_type: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
        weight: weight,
        length: 10,
        breadth: 10,
        height: 10,
        order_value: String(orderValue)
      };

      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/courier/serviceability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status || !nimbusData.data || nimbusData.data.length === 0) {
        return res.status(200).json({
          success: false,
          error: nimbusData.message || 'No serviceable couriers found for this pincode.'
        });
      }

      // Sort couriers by charges to find the cheapest
      const couriers = nimbusData.data.map(c => ({
        courierId: c.courier_id || c.id,
        name: c.name || c.courier_name,
        charges: parseFloat(c.rate || c.total_charges || c.freight_charges || c.courier_charges || 0)
      })).sort((a, b) => a.charges - b.charges);

      return res.status(200).json({
        success: true,
        cheapest: couriers[0],
        couriers: couriers
      });

    } else if (action === 'create_shipment') {
      // B2C Shipment booking requires API Key in headers
      const apiKey = getEnv('NIMBUSPOST_API_KEY');
      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'NIMBUSPOST_API_KEY is not configured in .env file.' });
      }

      const warehouseId = getEnv('NIMBUSPOST_WAREHOUSE_ID') || '3';
      const totalQty = (payload.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const calculatedWeight = Math.max(0.03, Math.round(totalQty * 0.03 * 100) / 100);
      const weightInGrams = Math.round(calculatedWeight * 1000);

      const requestBody = {
        consignee: {
          name: payload.customerName,
          address: payload.shippingAddress.address + (payload.orderedPhoneNumber ? ` (Mob: ${payload.orderedPhoneNumber})` : ""),
          address_2: "",
          city: payload.shippingAddress.city || 'Delhi',
          state: payload.shippingAddress.state || 'Delhi',
          pincode: String(payload.shippingAddress.pincode || '110001'),
          phone: String(payload.orderedPhoneNumber || '9999999999')
        },
        order: {
          order_number: payload.orderNumber,
          shipping_charges: 0,
          discount: 0,
          cod_charges: 0,
          payment_type: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
          total: parseFloat(payload.totalAmount),
          package_weight: weightInGrams,
          package_length: 10,
          package_height: 10,
          package_breadth: 10
        },
        order_items: (payload.items || []).map(item => ({
          name: item.typeofqr === 'personalised' ? 'Personalised QR Keychain' : 'Classic QR Keychain',
          qty: String(item.quantity || 1),
          price: String(item.unitPrice || 299),
          sku: item.typeofqr === 'personalised' ? 'PERSONALQR' : 'CLASSICQR'
        })),
        pickup_warehouse_id: String(warehouseId),
        rto_warehouse_id: String(warehouseId)
      };

      if (payload.courierId) {
        requestBody.courier_id = String(payload.courierId);
        requestBody.order.courier_id = String(payload.courierId);
      }

      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/shipments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'NP-API-KEY': apiKey.trim()
        },
        body: JSON.stringify(requestBody)
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message || nimbusData.error });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderId: nimbusData.data.order_id || nimbusData.data.id || '',
          shipmentId: nimbusData.data.shipment_id || '',
          awbNumber: nimbusData.data.awb_number || '',
          courierName: nimbusData.data.courier_name || 'Delhivery B2C',
          labelUrl: nimbusData.data.label || ''
        }
      });

    } else if (action === 'cancel_shipment') {
      const apiKey = getEnv('NIMBUSPOST_API_KEY');
      if (!apiKey) {
        return res.status(400).json({ success: false, error: 'NIMBUSPOST_API_KEY is not configured in .env file.' });
      }

      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/shipments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'NP-API-KEY': apiKey.trim()
        },
        body: JSON.stringify({
          awb: payload.awbNumber,
          awb_number: payload.awbNumber
        })
      });

      const nimbusData = await nimbusRes.json();
      if (!nimbusData.status) {
        return res.status(400).json({ success: false, error: nimbusData.message });
      }

      return res.status(200).json({ success: true, message: 'Shipment cancelled successfully' });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (err) {
    console.error('NimbusPost Backend Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
