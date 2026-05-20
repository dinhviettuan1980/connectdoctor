// Global auth store — subscribes to Firebase auth state changes and
// loads the corresponding /users/{uid} doc.

import { create } from "zustand";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, Role } from "@/lib/types";

interface AuthState {
  initializing: boolean;
  user: AppUser | null;
  setUser: (u: AppUser | null) => void;
  pendingRole: Role | null;            // chosen on /role-select before sign-in
  setPendingRole: (r: Role | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initializing: true,
  user: null,
  setUser: (u) => set({ user: u, initializing: false }),
  pendingRole: null,
  setPendingRole: (r) => set({ pendingRole: r }),
}));

// Wire Firebase listeners once on app boot.
let userDocUnsub: (() => void) | null = null;

export function initAuthListener() {
  return onAuthStateChanged(auth, (fbUser) => {
    if (userDocUnsub) userDocUnsub();
    if (!fbUser) {
      useAuthStore.getState().setUser(null);
      return;
    }
    userDocUnsub = onSnapshot(
      doc(db, "users", fbUser.uid),
      (snap) => {
        const data = snap.data() as AppUser | undefined;
        useAuthStore.getState().setUser(
          data ?? {
            uid: fbUser.uid,
            email: fbUser.email,
            phone: fbUser.phoneNumber,
            displayName: fbUser.displayName,
            role: "patient",
            createdAt: Date.now(),
          },
        );
      },
      (err) => {
        // Firestore rules not yet deployed → fall back to Firebase Auth data
        if (err.code === "permission-denied") {
          useAuthStore.getState().setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            phone: fbUser.phoneNumber,
            displayName: fbUser.displayName,
            role: "patient",
            createdAt: Date.now(),
          });
        }
      },
    );
  });
}
