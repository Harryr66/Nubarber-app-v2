
// The Firebase configuration is fetched from environment variables.
// This single configuration is used for the entire application,
// and we will specify the database ID when connecting to Firestore for different regions.

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Map business regions to their corresponding Firestore database IDs.
// The '(default)' database is used for the US region.
export const databaseIdMap: { [key: string]: string } = {
    us: 'default',
    eu: 'europe-db', // The ID you set when creating the EU database
    uk: 'uk-db',     // The ID you set when creating the UK database
};
