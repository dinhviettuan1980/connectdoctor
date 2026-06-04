import {
  collection, doc, getDoc, getDocs, query, where, updateDoc,
  onSnapshot, serverTimestamp, limit as fbLimit, orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { AppUser } from "./types";

export async function listAllUsers(max = 200): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, "users"), fbLimit(max)));
  return snap.docs.map((d) => d.data() as AppUser);
}

const ONLINE_WINDOW_MS = 90_000;

export async function findUserByEmailOrPhone(email?: string, phone?: string): Promise<AppUser | null> {
  if (email?.trim()) {
    const snap = await getDocs(query(collection(db, "users"), where("email", "==", email.trim().toLowerCase())));
    if (snap.docs.length) return snap.docs[0].data() as AppUser;
  }
  if (phone?.trim()) {
    const digits = phone.replace(/\D/g, "");
    const candidates = new Set<string>([digits]);
    if (digits.startsWith("84")) candidates.add("0" + digits.slice(2));
    if (digits.startsWith("0")) candidates.add("+84" + digits.slice(1));
    if (digits.startsWith("0")) candidates.add("84" + digits.slice(1));
    candidates.add("+" + digits);
    for (const c of candidates) {
      const snap = await getDocs(query(collection(db, "users"), where("phone", "==", c)));
      if (snap.docs.length) return snap.docs[0].data() as AppUser;
    }
  }
  return null;
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
}

export function subscribeToUser(uid: string, callback: (user: AppUser | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => callback(snap.exists() ? (snap.data() as AppUser) : null),
    () => callback(null),
  );
}

export function isOnline(user: AppUser | null | undefined): boolean {
  if (!user?.lastSeen) return false;
  return Date.now() - user.lastSeen < ONLINE_WINDOW_MS;
}

export async function touchLastSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { lastSeen: Date.now() }).catch(() => {});
}
