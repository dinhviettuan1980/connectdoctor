import { useEffect } from "react";
import { Platform } from "react-native";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as WebBrowser from "expo-web-browser";
import { FacebookAuthProvider, signInWithCredential, signInWithRedirect } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { setPendingCredential } from "@/lib/pendingCredential";

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
        .catch((e) => {
          if (e.code === "auth/account-exists-with-different-credential") {
            const pendingCred = FacebookAuthProvider.credentialFromError(e);
            if (pendingCred) setPendingCredential(pendingCred);
            onError(new Error(
              "Email này đã đăng ký bằng Google. Bấm 'Tiếp tục với Google' để đăng nhập — Facebook sẽ tự động được liên kết."
            ));
          } else {
            onError(e);
          }
        });
    } else if (response?.type === "error") {
      onError(new Error(response.error?.message ?? "Facebook Sign-In thất bại."));
    }
  }, [response]);

  const signIn = async () => {
    if (Platform.OS === "web") {
      await signInWithRedirect(auth, new FacebookAuthProvider());
    } else {
      await promptAsync();
    }
  };

  return { signIn, ready: !!request };
}
