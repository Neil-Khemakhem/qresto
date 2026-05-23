import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCD0gMbMDWqljagaK7HX45Pm1p0H37mKm8",
  authDomain: "qresto-d2f28.firebaseapp.com",
  projectId: "qresto-d2f28",
  storageBucket: "qresto-d2f28.firebasestorage.app",
  messagingSenderId: "589447557367",
  appId: "1:589447557367:web:2f01ff2a1f2957ab06e3f2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);