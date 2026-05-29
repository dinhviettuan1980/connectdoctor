import "@/global.css";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getRedirectResult, FacebookAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore, initAuthListener } from "@/hooks/useAuth";
import { registerPushToken, getNotificationResponse, addNotificationListener } from "@/lib/notifications";
import { loadOrInitUserDoc } from "@/lib/auth";
import { linkPendingAndNotify } from "@/hooks/useGoogleSignIn";
import { setPendingCredential } from "@/lib/pendingCredential";
import { startLocationTracking, stopLocationTracking } from "@/lib/locationTracking";

const queryClient = new QueryClient();

function navigateToThread(threadId: string, role: string, router: ReturnType<typeof useRouter>) {
  const [patientUid, doctorUid] = threadId.split("_");
  if (role === "doctor") {
    router.push(`/(doctor)/chat/${patientUid}` as any);
  } else {
    router.push(`/(patient)/chat/${doctorUid}` as any);
  }
}

function AuthGate() {
  const { user, initializing } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const notifListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return initAuthListener();
  }, []);

  // Handle OAuth redirect result on web (Google/Facebook redirect flow)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    getRedirectResult(auth).then(async (result) => {
      if (!result) return;
      await linkPendingAndNotify(result.user, async (fbUser) => {
        await loadOrInitUserDoc(fbUser);
      });
    }).catch((e) => {
      if (e?.code === "auth/account-exists-with-different-credential") {
        const pendingCred = FacebookAuthProvider.credentialFromError(e);
        if (pendingCred) setPendingCredential(pendingCred);
      }
    });
  }, []);

  // Register push token and handle notification taps after login
  useEffect(() => {
    if (!user) {
      notifListenerRef.current?.();
      notifListenerRef.current = null;
      stopLocationTracking();
      return;
    }

    registerPushToken(user.uid);
    startLocationTracking(user.uid);

    // Handle tap on notification that opened the app from killed state
    getNotificationResponse().then((response) => {
      if (!response) return;
      const threadId = (response.notification.request.content.data as Record<string, unknown>)?.threadId as string | undefined;
      if (threadId) navigateToThread(threadId, user.role, router);
    });

    // Handle tap while app is in background
    addNotificationListener(({ threadId }) => {
      if (threadId) navigateToThread(threadId, user.role, router);
    }).then((unsub) => {
      notifListenerRef.current = unsub;
    });
  }, [user?.uid]);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inPatient = segments[0] === "(patient)";
    const inDoctor = segments[0] === "(doctor)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user) {
      const isAdmin = user.role === "admin";
      const isDoctor = user.role === "doctor";
      if (inAuthGroup) {
        router.replace(isDoctor ? "/(doctor)/home" : "/(patient)/home");
      } else if (isDoctor && inPatient) {
        router.replace("/(doctor)/home");
      } else if ((user.role === "patient" || isAdmin) && inDoctor) {
        router.replace("/(patient)/home");
      }
    }
  }, [user, initializing, segments]);

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-paper">
        <ActivityIndicator />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AuthGate />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
