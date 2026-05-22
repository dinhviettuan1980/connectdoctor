import { useEffect } from "react";
import { Platform } from "react-native";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as WebBrowser from "expo-web-browser";
import { FacebookAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? "";

export function useFacebookSignIn(
  onSuccess: (user: import("firebase/auth").User) => void,
  onError: (err: Error) => void,
) {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FB_APP_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const accessToken = response.authentication?.accessToken ?? response.params?.access_token;
      if (!accessToken) { onError(new Error("Không nhận được access token từ Facebook.")); return; }
      const credential = FacebookAuthProvider.credential(accessToken);
      signInWithCredential(auth, credential)
        .then((cred) => onSuccess(cred.user))
        .catch(onError);
    } else if (response?.type === "error") {
      onError(new Error(response.error?.message ?? "Facebook Sign-In thất bại."));
    }
  }, [response]);

  const signIn = async () => {
    if (Platform.OS === "web") {
      try {
        const cred = await signInWithPopup(auth, new FacebookAuthProvider());
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
