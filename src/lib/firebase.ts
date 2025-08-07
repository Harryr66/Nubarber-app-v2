
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// --- Singleton Pattern for Firebase Initialization ---
// This ensures that Firebase is initialized only once, and only when the config is valid.

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let defaultDb: Firestore | null = null;
const dbInstances: { [key: string]: Firestore } = {};

function initializeFirebase() {
  // Only initialize if it hasn't been done and the API key is present.
  if (!getApps().length && firebaseConfig.apiKey) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        defaultDb = getFirestore(app);
        dbInstances['default'] = defaultDb;
    } catch (e) {
        console.error("Firebase initialization error:", e);
        // Reset instances if initialization fails
        app = null;
        auth = null;
        defaultDb = null;
    }
  } else if (getApps().length > 0 && !app) {
    // This handles the case where the app is initialized on the server first
    // but our local variables haven't been set yet.
    app = getApp();
    auth = getAuth(app);
    defaultDb = getFirestore(app);
  }
}

/**
 * Returns the globally available, initialized Firebase services.
 * Throws an error if initialization fails.
 * @returns An object containing the Firebase app, auth, and default db instance.
 */
export const getFirebase = () => {
  // Initialize on every call if not already initialized.
  // The logic inside initializeFirebase() ensures it only runs once.
  if (!app) {
    initializeFirebase();
  }
  
  if (!app || !auth || !defaultDb) {
      throw new Error("Firebase Initialization Failed: Missing API Key. Check your .env.local file.");
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
  const { app: currentApp, defaultDb: currentDefaultDb } = getFirebase(); // Ensures app is initialized

  const databaseId = databaseIdMap[region];
  
  if (!databaseId) {
    console.warn(`No database ID found for region "${region}". Falling back to default DB.`);
    return currentDefaultDb;
  }
  
  if (dbInstances[databaseId]) {
    return dbInstances[databaseId];
  }

  const regionalDb = getFirestore(currentApp, databaseId);
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
