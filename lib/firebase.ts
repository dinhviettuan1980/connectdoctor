// Firebase modular SDK — works on web, iOS, Android via Expo.
// For production, move config values to .env and load via expo-constants.
//
// Setup:
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Add a Web app, copy config below
// 3. Enable Auth providers: Email/Password, Phone, Google, Facebook
// 4. Enable Firestore + Storage

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // @ts-ignore — getReactNativePersistence is exported but not typed in v11
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// TODO: replace with your project config from Firebase console.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "TODO",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "TODO",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "TODO",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "TODO",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "TODO",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "TODO",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth persistence:
// - Web: default IndexedDB persistence via getAuth()
// - Native: AsyncStorage via initializeAuth(getReactNativePersistence(...))
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if already called (fast refresh) — fall back to getAuth.
    auth = getAuth(app);
  }
}

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
