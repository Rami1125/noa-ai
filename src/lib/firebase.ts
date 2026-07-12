/**
 * ==========================================
 * src/lib/firebase.ts
 * שכבת התקשורת למסד הנתונים Whatsapp Firebase
 * ==========================================
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

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

// אתחול חכם למניעת קריסות (Singleton Pattern) - מונע אתחול כפול ב-Hot Reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// חשיפת הממשקים לעבודה בשאר חלקי האפליקציה
export const db = getFirestore(app);     // עבור מסד נתונים Cloud Firestore
export const rtdb = getDatabase(app);    // עבור מסד נתונים Realtime Database
