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
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.includes('=')) continue;
        const [k, ...v] = line.split('=');
        if (k.trim() === key) {
          return v.join('=').trim();
        }
      }
    }
  } catch (err) {
    console.error("Error reading fallback local env:", err);
  }
  return '';
};

import { isRateLimited } from './utils/rate-limiter.js';

export default function handler(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip_unknown';
  if (isRateLimited(ip, 10, 60 * 1000)) {
    return res.status(429).json({ success: false, error: 'Too many login attempts. Please wait 1 minute.' });
  }

  // Allow JSON parsing natively in Vercel handlers
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { password } = req.body;
  const adminPassword = getEnv('ADMIN_PASSWORD') || 'Nikhil@2006';

  if (password === adminPassword) {
    // Return success and credentials
    return res.status(200).json({
      success: true,
      config: {
        apiKey: getEnv('VITE_FIREBASE_API_KEY'),
        authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
        storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getEnv('VITE_FIREBASE_APP_ID'),
        measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
      }
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Incorrect admin password.'
    });
  }
}
