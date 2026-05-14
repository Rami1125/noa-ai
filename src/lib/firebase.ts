import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
