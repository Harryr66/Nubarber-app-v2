
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// This file implements a robust singleton pattern for Firebase initialization
// to prevent race conditions and ensure Firebase is only initialized once.

let app: FirebaseApp;
let auth: Auth;
let defaultDb: Firestore;
const dbInstances: { [key: string]: Firestore } = {};

/**
 * Returns the globally available, initialized Firebase services.
 * Initializes Firebase on the first call and returns the cached instances on subsequent calls.
 * Throws an error if the configuration is invalid.
 * @returns An object containing the Firebase app, auth, and default db instance.
 */
export const getFirebase = () => {
  if (!firebaseConfig.apiKey) {
      throw new Error("Firebase Initialization Failed: Missing API Key. Check your .env.local file.");
  }

  if (!getApps().length) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        defaultDb = getFirestore(app);
        dbInstances['default'] = defaultDb;
    } catch (e) {
        console.error("Firebase initialization error:", e);
        throw new Error("Firebase initialization failed. Please check the console for details.");
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    if (!defaultDb) {
      defaultDb = getFirestore(app);
      dbInstances['default'] = defaultDb;
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
  const { app: currentApp, defaultDb: currentDefaultDb } = getFirebase(); // Ensures app is initialized

  const databaseId = databaseIdMap[region];
  
  if (!databaseId) {
    console.warn(`No database ID found for region "${region}". Falling back to default DB.`);
    return currentDefaultDb;
  }
  
  // Use a consistent key for the cache
  const cacheKey = databaseId === 'default' ? 'default' : databaseId;
  
  if (dbInstances[cacheKey]) {
    return dbInstances[cacheKey];
  }

  const regionalDb = getFirestore(currentApp, databaseId);
  dbInstances[cacheKey] = regionalDb;

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
    
    // The 'shops' collection with region info is always in the default database.
    const shopDocRef = doc(currentDefaultDb, "shops", currentUser.uid);
    try {
        const shopDoc = await getDoc(shopDocRef);
        if (shopDoc.exists()) {
            const region = shopDoc.data()?.region;
            if (region && region !== 'us') { // 'us' uses the default DB
                return getDbForRegion(region);
            }
        }
    } catch(e) {
        console.error("Could not fetch user region, falling back to default DB", e);
    }

    // Fallback to the default instance if region is not found, invalid, or 'us'.
    return currentDefaultDb;
};
