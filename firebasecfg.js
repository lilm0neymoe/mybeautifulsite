import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOjXDQ6VBEewJ13MuD4rWK3R0vjNeRkKY",
  authDomain: "teschting-e95b3.firebaseapp.com",
  projectId: "teschting-e95b3",
  storageBucket: "teschting-e95b3.firebasestorage.app",
  messagingSenderId: "442828376755",
  appId: "1:442828376755:web:6b59970b5e42ec34a77ec6",
  measurementId: "G-44KDYP4C4Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, getDoc, collection, addDoc, getDocs };
