// Auth + role helpers wrapping Firebase Auth.
// All UI screens consume these via useAuth() (see hooks/useAuth.ts).

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithCredential,
  User as FbUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser, Role } from "./types";
import { Platform } from "react-native";

export async function signUpWithEmail(
  email: string,
  password: string,
  role: Role,
  displayName?: string,
): Promise<AppUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return upsertUserDoc(cred.user, role, { displayName });
}

export async function signInWithEmail(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return loadOrInitUserDoc(cred.user);
}

export async function signInWithGoogle(role?: Role): Promise<AppUser> {
  if (Platform.OS === "web") {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    return loadOrInitUserDoc(cred.user, role);
  }
  // Native: use expo-auth-session / @react-native-google-signin. Stubbed here.
  throw new Error("TODO: wire expo-auth-session for native Google sign-in");
}

export async function signInWithFacebook(role?: Role): Promise<AppUser> {
  if (Platform.OS === "web") {
    const cred = await signInWithPopup(auth, new FacebookAuthProvider());
    return loadOrInitUserDoc(cred.user, role);
  }
  throw new Error("TODO: wire expo-auth-session / Facebook SDK for native");
}

export async function signOut() {
  await fbSignOut(auth);
}

async function upsertUserDoc(
  fbUser: FbUser,
  role: Role,
  extra: Partial<AppUser> = {},
): Promise<AppUser> {
  const ref = doc(db, "users", fbUser.uid);
  const user: AppUser = {
    uid: fbUser.uid,
    email: fbUser.email,
    phone: fbUser.phoneNumber,
    displayName: extra.displayName ?? fbUser.displayName,
    role,
    createdAt: Date.now(),
  };
  await setDoc(ref, { ...user, _createdAt: serverTimestamp() }, { merge: true });
  return user;
}

async function loadOrInitUserDoc(fbUser: FbUser, defaultRole: Role = "patient"): Promise<AppUser> {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as AppUser;
  // First time login via social — caller should redirect to /role-select to set role.
  return upsertUserDoc(fbUser, defaultRole);
}

export async function setUserRole(uid: string, role: Role) {
  await setDoc(doc(db, "users", uid), { role }, { merge: true });
}
