import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Même projet Firebase que l'app mobile et l'admin web
const firebaseConfig = {
  apiKey: "AIzaSyD4hmGzST17RQzALGrgMbgJYAAkT-AuHgg",
  authDomain: "artisan-connect-benin.firebaseapp.com",
  projectId: "artisan-connect-benin",
  storageBucket: "artisan-connect-benin.firebasestorage.app",
  messagingSenderId: "892467393728",
  appId: "1:892467393728:web:f32dfd776b98ca5c00a925",
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
