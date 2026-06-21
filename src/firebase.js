import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Dynamically initialize Firebase with configurations fetched from the backend API
export const initializeFirebase = (config) => {
  if (!config || !config.apiKey) {
    throw new Error("Invalid Firebase configuration provided.");
  }
  
  // Reuse existing initialized app or create a new one
  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const dbInstance = getFirestore(app);
  return dbInstance;
};

