
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// --- Singleton Pattern for Firebase Initialization ---
// This ensures that Firebase is initialized only once and is available synchronously.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let defaultDb: Firestore | null = null;
const dbInstances: { [key: string]: Firestore } = {};

function initializeFirebase() {
  // Only run initialization if it hasn't been done yet.
  if (app) return;

  // Check for a valid API key BEFORE initializing. This is the crucial step.
  if (!firebaseConfig.apiKey) {
    console.error("Firebase Initialization Failed: Missing API Key. Check your .env.local file.");
    return; // Stop initialization if the key is missing.
  }
  
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  defaultDb = getFirestore(app);
  dbInstances['default'] = defaultDb;
}

// Initialize Firebase as soon as this module is loaded.
initializeFirebase();

/**
 * Returns the globally available, initialized Firebase services.
 * @returns An object containing the Firebase app, auth, and default db instance, or nulls if initialization failed.
 */
export const getFirebase = () => {
  // If initialization failed on the first try (e.g., missing key),
  // the instances will be null.
  return { app, auth, defaultDb };
}

/**
 * Initializes and returns a Firestore instance for a specific region.
 * Caches instances to avoid re-initialization.
 * @param region - The region ('us', 'eu', 'uk').
 * @returns A Firestore instance for the given region.
 */
const getDbForRegion = (region: string): Firestore => {
  // If the default DB doesn't exist, something is very wrong.
  if (!defaultDb || !app) {
      throw new Error("Default Firebase instance is not available.");
  }

  const databaseId = databaseIdMap[region];
  
  if (!databaseId) {
    console.warn(`No database ID found for region "${region}". Falling back to default DB.`);
    return defaultDb;
  }
  
  if (dbInstances[databaseId]) {
    return dbInstances[databaseId];
  }

  const regionalDb = getFirestore(app, databaseId);
  dbInstances[databaseId] = regionalDb;

  return regionalDb;
}


/**
 * Gets the correct Firestore instance based on the currently logged-in user's region.
 * This is the primary function components should use to get a database instance.
 * @returns A promise that resolves to the user-specific Firestore instance.
 */
export const getUserDb = async (): Promise<Firestore> => {
    // Ensure auth and defaultDb are initialized before trying to access them
    if (!auth || !defaultDb) {
        throw new Error("Firebase has not been initialized correctly.");
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        // Return the default DB if no user is logged in (e.g., for sign-up or public pages)
        return defaultDb;
    }
    
    const shopDocRef = doc(defaultDb, "shops", currentUser.uid);
    try {
        const shopDoc = await getDoc(shopDocRef);
        if (shopDoc.exists()) {
            const region = shopDoc.data()?.region;
            if (region) {
                return getDbForRegion(region);
            }
        }
    } catch(e) {
        console.error("Could not fetch user region, falling back to default DB", e);
    }

    // Fallback to the default instance if region is not found or invalid
    return defaultDb;
};
