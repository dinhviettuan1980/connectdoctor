import { useEffect } from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

export function useGoogleSignIn(
  onSuccess: (user: import("firebase/auth").User) => void,
  onError: (err: Error) => void,
) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (!idToken) { onError(new Error("Không nhận được ID token từ Google.")); return; }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then((cred) => onSuccess(cred.user))
        .catch(onError);
    } else if (response?.type === "error") {
      onError(new Error(response.error?.message ?? "Google Sign-In thất bại."));
    }
  }, [response]);

  const signIn = async () => {
    if (Platform.OS === "web") {
      try {
        const cred = await signInWithPopup(auth, new GoogleAuthProvider());
        onSuccess(cred.user);
      } catch (e) {
        onError(e as Error);
      }
    } else {
      await promptAsync();
    }
  };

  return { signIn, ready: !!request };
}
