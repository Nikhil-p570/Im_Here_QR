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

// Helper: login and return bearer token (Using B2B Login Endpoint)
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
    // 1. Authenticate with NimbusPost
    const token = await getNimbusToken();

    // 2. Route based on action
    if (action === 'wallet_balance') {
      // B2B Wallet Balance API
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

      return res.status(200).json({
        success: true,
        walletBalance: parseFloat(nimbusData.data.available_limit || nimbusData.data.wallet_balance || 0)
      });

    } else if (action === 'calculate_rates') {
      // B2B Serviceability / Rate Calculator API
      const pickupPincode = getEnv('NIMBUSPOST_PICKUP_PINCODE') || '122001';
      const destinationPincode = payload.destinationPincode;
      const orderValue = payload.totalAmount || 100;
      const totalQty = payload.totalQty || 1;

      // Assume 100g (0.1 Kg) per keychain, package dimensions 10cm x 10cm x 10cm
      const weight = Math.max(1, Math.round(totalQty * 0.1 * 100) / 100); // weight in kg/gram depending on API. The B2B api weight is typically in Kg. Let's make it 1kg minimum for B2B cargo.
      
      const requestBody = {
        origin: pickupPincode,
        destination: destinationPincode,
        payment_type: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
        details: [
          {
            qty: totalQty,
            weight: weight,
            length: 10,
            breadth: 10,
            height: 10
          }
        ],
        order_value: String(orderValue)
      };

      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/courier/b2b_serviceability', {
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
        courierId: c.courier_id,
        name: c.name,
        charges: parseFloat(c.courier_charges || 0)
      })).sort((a, b) => a.charges - b.charges);

      return res.status(200).json({
        success: true,
        cheapest: couriers[0],
        couriers: couriers
      });

    } else if (action === 'create_shipment') {
      // B2B Create Shipment API
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

      const totalQty = (payload.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
      const calculatedWeight = Math.max(1, Math.round(totalQty * 0.1));

      const requestBody = {
        order_id: payload.orderNumber,
        payment_method: payload.paymentMode === 'cod' ? 'cod' : 'prepaid',
        consignee_name: payload.customerName,
        consignee_company_name: payload.customerName, // Use customer name as company for B2B API constraint
        consignee_phone: String(payload.orderedPhoneNumber || '9999999999'),
        consignee_email: payload.orderedEmail || 'test@gmail.com',
        consignee_gst_number: '',
        consignee_address: payload.shippingAddress.address,
        consignee_pincode: parseInt(payload.shippingAddress.pincode || '110001'),
        consignee_city: payload.shippingAddress.city || 'Delhi',
        consignee_state: payload.shippingAddress.state || 'Delhi',
        no_of_invoices: 1,
        no_of_boxes: 1,
        courier_id: String(payload.courierId || '244'), // Delhivery B2B default or cheapest ID passed from front
        request_auto_pickup: 'no',
        invoice: [
          {
            invoice_number: `INV-${payload.orderNumber}`,
            invoice_date: new Date().toISOString().split('T')[0],
            invoice_value: String(payload.totalAmount)
          }
        ],
        pickup: pickupDetails,
        products: (payload.items || []).map(item => ({
          product_name: item.typeofqr === 'personalised' ? 'Personalised QR Keychain' : 'Classic QR Keychain',
          product_hsn_code: '4901', // General code
          product_lbh_unit: 'cm',
          no_of_box: '1',
          product_tax_per: '0.0000',
          product_price: String(item.unitPrice || 299),
          product_weight_unit: 'kg',
          product_length: 10,
          product_breadth: 10,
          product_height: 10,
          product_weight: Math.round((item.quantity || 1) * 0.1) || 1
        }))
      };

      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/shipmentcargo/create', {
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
          courierName: nimbusData.data.courier_name || ' Delhivery B2B',
          labelUrl: nimbusData.data.label
        }
      });

    } else if (action === 'cancel_shipment') {
      const nimbusRes = await fetch('https://ship.nimbuspost.com/api/shipmentcargo/Cancel', {
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

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (err) {
    console.error('NimbusPost Backend Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
