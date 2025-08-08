
'use server';

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// All Firebase configuration is now in this single file to ensure reliability.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

/**
 * A robust, simplified function to get Firebase services.
 * This guarantees Firebase is initialized only once.
 */
export const getFirebase = () => {
  if (!getApps().length) {
    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase Initialization Failed: Missing API Key. Check your environment variables.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  // The 'db' returned here is now the one and only default database.
  return { app, auth, defaultDb: db };
};

/**
 * Returns the single, default Firestore database instance.
 * The multi-regional complexity has been removed to ensure stability.
 */
export const getUserDb = async (): Promise<Firestore> => {
    const { defaultDb } = getFirebase();
    return defaultDb;
};
