import { Platform } from "react-native";
import type { AuthCredential } from "firebase/auth";

const KEY = "cd_pending_credential";

function save(cred: AuthCredential | null) {
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    if (cred) {
      sessionStorage.setItem(KEY, JSON.stringify(cred));
    } else {
      sessionStorage.removeItem(KEY);
    }
  }
}

function load(): AuthCredential | null {
  if (Platform.OS !== "web" || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthCredential) : null;
  } catch {
    return null;
  }
}

let memPending: AuthCredential | null = null;

export function setPendingCredential(cred: AuthCredential | null) {
  memPending = cred;
  save(cred);
}

export function consumePendingCredential(): AuthCredential | null {
  const cred = memPending ?? load();
  memPending = null;
  save(null);
  return cred;
}
