import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Intelligence DB (Primary AI Studio DB for DNA, Chats, History)
export const dbIntelligence = getFirestore(app, "ai-studio-cc5d2687-b402-4b97-b808-5ba700689e0e");

// Drive DB (Real-time Orders, Inventory, Supplier Lists)
export const dbDrive = getFirestore(app, "saban-ai-drive");

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
