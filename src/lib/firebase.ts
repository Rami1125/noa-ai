import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Intelligence DB (Dynamic from AI Studio config instead of hardcoded)
export const INTELLIGENCE_APP_ID = firebaseConfig.firestoreDatabaseId;
export const dbIntelligence = getFirestore(app, INTELLIGENCE_APP_ID);

// Drive DB (Real-time Orders, Inventory, Supplier Lists)
export const DRIVE_APP_ID = "saban-ai-drive";
export const dbDrive = getFirestore(app, DRIVE_APP_ID);

// Export 'db' as dbIntelligence for backward compatibility
export const db = dbIntelligence;

export const initAuth = async () => {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    return null;
  }
};
