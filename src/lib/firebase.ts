
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig, databaseIdMap } from "./firebase-config";

// This will be our singleton instance
let firebaseInstance: {
  app: FirebaseApp;
  auth: Auth;
  defaultDb: Firestore;
  dbInstances: { [key: string]: Firestore };
} | null = null;


/**
 * Initializes Firebase App and services, ensuring it only happens once.
 * @returns An object containing the Firebase app, auth, and db instances.
 */
export const getFirebase = () => {
  if (firebaseInstance) {
    return firebaseInstance;
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const defaultDb = getFirestore(app);
  const dbInstances: { [key: string]: Firestore } = {
    'default': defaultDb,
  };

  firebaseInstance = { app, auth, defaultDb, dbInstances };
  return firebaseInstance;
}


/**
 * Initializes and returns a Firestore instance for a specific region.
 * Caches instances to avoid re-initialization.
 * @param region - The region ('us', 'eu', 'uk').
 * @returns A Firestore instance for the given region.
 */
const getDbForRegion = (region: string): Firestore => {
  const { app, defaultDb, dbInstances } = getFirebase();
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
    const { auth, defaultDb } = getFirebase();
    
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
