import type { AuthCredential } from "firebase/auth";

let pending: AuthCredential | null = null;

export function setPendingCredential(cred: AuthCredential | null) {
  pending = cred;
}

export function consumePendingCredential(): AuthCredential | null {
  const cred = pending;
  pending = null;
  return cred;
}
