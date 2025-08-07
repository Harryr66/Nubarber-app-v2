
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// --- Singleton Pattern for Firebase Initialization ---
// This ensures that Firebase is initialized only once and is available synchronously.

let app: FirebaseApp;
let auth: Auth;
let defaultDb: Firestore;
const dbInstances: { [key: string]: Firestore } = {};

function initializeFirebase() {
  if (getApps().length === 0) {
    if (!firebaseConfig.apiKey) {
      console.error("Missing Firebase API Key. The app cannot connect to Firebase.");
      // We don't throw an error here to allow the app to run, but Firebase will not work.
      // The error will be caught by pages that try to use Firebase services.
      return; 
    }
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
 * @returns An object containing the Firebase app, auth, and default db instance.
 */
export const getFirebase = () => {
  if (!app) {
    // This will happen if the API key was missing.
    // We re-run initialize in case the env vars have loaded late, but it's unlikely.
    initializeFirebase();
    if (!app) {
       // Still no app, we must return nulls or throw.
       // For now, let's log an error and subsequent calls will fail.
       console.error("Firebase could not be initialized. Check your environment variables.");
    }
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
    // Ensure auth is initialized before trying to access currentUser
    if (!auth) {
        return defaultDb;
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

