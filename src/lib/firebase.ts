/**
 * ==========================================
 * src/lib/firebase.ts
 * שכבת התקשורת למסד הנתונים והרשאות Whatsapp Firebase
 * ==========================================
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; // הוספנו את מודול ההתחברות

const firebaseConfig = {
  apiKey: "AIzaSyAg1mkCCOs1A7inc4HfPmTND2t26zbgf9A",
  authDomain: "whatsapp-8ffd1.firebaseapp.com",
  databaseURL: "https://whatsapp-8ffd1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "whatsapp-8ffd1",
  storageBucket: "whatsapp-8ffd1.firebasestorage.app",
  messagingSenderId: "248003330797",
  appId: "1:248003330797:web:db93f4c5b223bfa647c2e4",
  measurementId: "G-D3DHQD4QRD"
};

// אתחול חכם למניעת קריסות (Singleton Pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// חשיפת הממשקים בדיוק בשמות שהפרויקט שלך (App.tsx ו-AdminDashboard) מחפש:
export const dbIntelligence = getFirestore(app); 
export const dbDrive = getFirestore(app);
export const initAuth = getAuth(app);

// משאיר לך גם את הדיפולטיביים למקרה שתצטרך בעתיד:
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
