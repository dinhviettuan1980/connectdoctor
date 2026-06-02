import { useEffect } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, linkWithCredential, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { consumePendingCredential } from "@/lib/pendingCredential";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// expo-auth-session validates the platform-specific clientId synchronously in useMemo:
//   iOS  → checks iosClientId
//   web  → checks webClientId
// Passing a non-empty fallback prevents the invariant throw when the env var is absent.
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
  (Platform.OS === "web" ? "web-redirect-mode" : undefined);

const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
  (Platform.OS === "ios" ? "ios-not-configured" : undefined);

export async function linkPendingAndNotify(
  googleUser: import("firebase/auth").User,
  onSuccess: (user: import("firebase/auth").User) => void,
) {
  const pending = consumePendingCredential();
  if (pending) {
    try {
      await linkWithCredential(googleUser, pending);
    } catch {
      // Already linked or other non-fatal error — proceed anyway
    }
  }
  onSuccess(googleUser);
}

export function useGoogleSignIn(
  onSuccess: (user: import("firebase/auth").User) => void,
  onError: (err: Error) => void,
) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) { onError(new Error("Không nhận được ID token từ Google.")); return; }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then((cred) => linkPendingAndNotify(cred.user, onSuccess))
        .catch(onError);
    } else if (response?.type === "error") {
      onError(new Error(response.error?.message ?? "Google Sign-In thất bại."));
    }
  }, [response]);

  const signIn = async () => {
    if (Platform.OS === "web") {
      try {
        const cred = await signInWithPopup(auth, new GoogleAuthProvider());
        await linkPendingAndNotify(cred.user, onSuccess);
      } catch (e: any) {
        if (e?.code !== "auth/popup-closed-by-user" && e?.code !== "auth/cancelled-popup-request") {
          onError(e);
        }
      }
    } else {
      await promptAsync();
    }
  };

  return { signIn, ready: !!request };
}
