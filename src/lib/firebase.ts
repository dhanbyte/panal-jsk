import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAh1X4xpS0EX-LEO9fhZEdXgx0fuGXB2vc",
  authDomain: "jsk-f60dd.firebaseapp.com",
  projectId: "jsk-f60dd",
  storageBucket: "jsk-f60dd.firebasestorage.app",
  messagingSenderId: "569679116880",
  appId: "1:569679116880:web:bd2081c088796382c16f55",
  measurementId: "G-F7D63DKWJJ"
};

// Initialize Firebase for Client SSR safety
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
