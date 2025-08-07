
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// --- Singleton Pattern for Firebase Initialization ---
// This ensures that Firebase is initialized only once.

let app: FirebaseApp;
let auth: Auth;
let defaultDb: Firestore;
const dbInstances: { [key: string]: Firestore } = {};

function initializeFirebase() {
  if (getApps().length === 0) {
    // This is the crucial check. Do not initialize if the key is missing.
    if (!firebaseConfig.apiKey) {
      console.error("Firebase Initialization Failed: Missing API Key. Check your .env.local file.");
      return; 
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    defaultDb = getFirestore(app);
    dbInstances['default'] = defaultDb;
  } else {
    app = getApp();
    auth = getAuth(app);
    defaultDb = getFirestore(app);
  }
}

// Initialize immediately.
initializeFirebase();

/**
 * Returns the globally available, initialized Firebase services.
 * @returns An object containing the Firebase app, auth, and default db instance.
 */
export const getFirebase = () => {
  // If initialization failed (e.g. missing key), the instances might not be set.
  // We re-run initializeFirebase() to be safe, but it will only truly run once.
  if (!app) {
    initializeFirebase();
  }
  return { app, auth, defaultDb };
}

/**
 * Initializes and returns a Firestore instance for a specific region.
 * Caches instances to avoid re-initialization.
 * @param region - The region ('us', 'eu', 'uk').
 * @returns A Firestore instance for the given region.
 */
const getDbForRegion = (region: string): Firestore => {
  if (!app) {
    initializeFirebase();
    if (!app) { // If it's still not initialized, throw an error.
      throw new Error("Default Firebase instance is not available after re-initialization attempt.");
    }
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
    const { auth: currentAuth, defaultDb: currentDefaultDb } = getFirebase();

    if (!currentAuth || !currentDefaultDb) {
        throw new Error("Firebase has not been initialized correctly.");
    }

    const currentUser = currentAuth.currentUser;
    if (!currentUser) {
        // Return the default DB if no user is logged in (e.g., for sign-up or public pages)
        return currentDefaultDb;
    }
    
    const shopDocRef = doc(currentDefaultDb, "shops", currentUser.uid);
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
    return currentDefaultDb;
};
