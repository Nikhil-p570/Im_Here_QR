/* global process */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Helper to load dotenv keys locally if not defined in process.env
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
    console.error("Error reading fallback local env in profile API:", err);
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

// Hashing helper
const hashString = (str, salt) => {
  return crypto.createHmac('sha256', salt).update(str).digest('hex');
};

import { isRateLimited } from './utils/rate-limiter.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate Limiting checks
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'ip_unknown';
  if (req.method === 'POST') {
    if (isRateLimited(ip, 15, 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many registration or update requests. Please wait 1 minute.' });
    }
  } else if (req.method === 'GET') {
    if (isRateLimited(ip, 100, 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many lookup requests. Please wait 1 minute.' });
    }
  }

  try {
    const db = getFirebaseDb();

    // ── GET METHOD: Retrieve public profile ──
    if (req.method === 'GET') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID parameter is required.' });
      }

      const docRef = doc(db, 'links', id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).json({ error: 'Profile not found.' });
      }

      const data = docSnap.data();

      // STRICT SECURITY: Remove credentials if they exist in legacy documents
      delete data.password;
      delete data.securityAnswer;
      delete data.passwordHash;
      delete data.securityAnswerHash;

      return res.status(200).json({ success: true, profile: data });
    }

    // ── POST METHOD: Actions (Register, Verify, Update) ──
    if (req.method === 'POST') {
      const { action, id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID is required.' });
      }

      const publicDocRef = doc(db, 'links', id);
      const privateDocRef = doc(db, 'links_private', id);

      // ACTION: REGISTER
      if (action === 'register') {
        const {
          name,
          number,
          altNumber,
          whatsappEnabled,
          message,
          rewardEnabled,
          rewardAmount,
          socials,
          password,
          securityQuestion,
          securityAnswer
        } = req.body;

        if (!password || !securityAnswer) {
          return res.status(400).json({ error: 'Password and security answer are required for registration.' });
        }

        const docSnap = await getDoc(publicDocRef);
        if (docSnap.exists() && docSnap.data().status === 'registered') {
          return res.status(400).json({ error: 'This QR Tag is already registered.' });
        }

        // Hash secrets
        const passwordHash = hashString(password.trim(), id);
        const securityAnswerHash = hashString(securityAnswer.trim().toLowerCase(), id);

        // Save public details
        const publicPayload = {
          id,
          name: name || '',
          number: number || '',
          altNumber: altNumber || '',
          whatsappEnabled: !!whatsappEnabled,
          message: message || '',
          rewardEnabled: !!rewardEnabled,
          rewardAmount: rewardAmount || '',
          socials: socials || [],
          status: 'registered',
          createdAt: new Date().toISOString()
        };

        // Save private credentials
        const privatePayload = {
          id,
          passwordHash,
          securityQuestion: securityQuestion || 'What is your favourite pet name?',
          securityAnswerHash,
          updatedAt: new Date().toISOString()
        };

        await setDoc(publicDocRef, publicPayload);
        await setDoc(privateDocRef, privatePayload);

        return res.status(200).json({ success: true, profile: publicPayload });
      }

      // ACTION: VERIFY
      if (action === 'verify') {
        const { password, securityAnswer } = req.body;

        const privSnap = await getDoc(privateDocRef);
        if (!privSnap.exists()) {
          return res.status(404).json({ error: 'Credentials not found. Tag might be unregistered.' });
        }

        const privData = privSnap.data();

        if (password !== undefined) {
          const checkHash = hashString(password.trim(), id);
          if (checkHash === privData.passwordHash) {
            return res.status(200).json({ success: true });
          } else {
            return res.status(401).json({ success: false, error: 'Incorrect password.' });
          }
        }

        if (securityAnswer !== undefined) {
          const checkHash = hashString(securityAnswer.trim().toLowerCase(), id);
          if (checkHash === privData.securityAnswerHash) {
            return res.status(200).json({ success: true });
          } else {
            return res.status(401).json({ success: false, error: 'Incorrect security answer.' });
          }
        }

        return res.status(400).json({ error: 'Specify password or securityAnswer to verify.' });
      }

      // ACTION: UPDATE
      if (action === 'update') {
        const {
          name,
          number,
          altNumber,
          whatsappEnabled,
          message,
          rewardEnabled,
          rewardAmount,
          socials,
          verificationPassword,
          verificationSecurityAnswer,
          newPassword,
          newSecurityQuestion,
          newSecurityAnswer
        } = req.body;

        if (!verificationPassword && !verificationSecurityAnswer) {
          return res.status(400).json({ error: 'Verification password or security answer is required to update.' });
        }

        // Verify password or security answer first
        const privSnap = await getDoc(privateDocRef);
        if (!privSnap.exists()) {
          return res.status(404).json({ error: 'Credentials not found.' });
        }

        const privData = privSnap.data();
        if (verificationPassword) {
          const checkHash = hashString(verificationPassword.trim(), id);
          if (checkHash !== privData.passwordHash) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Incorrect password.' });
          }
        } else if (verificationSecurityAnswer) {
          const checkHash = hashString(verificationSecurityAnswer.trim().toLowerCase(), id);
          if (checkHash !== privData.securityAnswerHash) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Incorrect security answer.' });
          }
        }

        // Prepare public update
        const publicUpdates = {
          name: name || '',
          number: number || '',
          altNumber: altNumber || '',
          whatsappEnabled: !!whatsappEnabled,
          message: message || '',
          rewardEnabled: !!rewardEnabled,
          rewardAmount: rewardAmount || '',
          socials: socials || [],
          updatedAt: new Date().toISOString()
        };

        // Prepare private updates if requested
        const privateUpdates = {};
        if (newPassword) {
          privateUpdates.passwordHash = hashString(newPassword.trim(), id);
        }
        if (newSecurityQuestion) {
          privateUpdates.securityQuestion = newSecurityQuestion;
        }
        if (newSecurityAnswer) {
          privateUpdates.securityAnswerHash = hashString(newSecurityAnswer.trim().toLowerCase(), id);
        }

        await updateDoc(publicDocRef, publicUpdates);
        if (Object.keys(privateUpdates).length > 0) {
          privateUpdates.updatedAt = new Date().toISOString();
          await updateDoc(privateDocRef, privateUpdates);
        }

        // Fetch refreshed profile to return
        const freshSnap = await getDoc(publicDocRef);
        return res.status(200).json({ success: true, profile: freshSnap.data() });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error("Profile API Error:", error);
    return res.status(500).json({ error: error.message || 'Internal server error.' });
  }
}
