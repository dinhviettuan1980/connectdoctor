import "@/global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore, initAuthListener } from "@/hooks/useAuth";

const queryClient = new QueryClient();

function AuthGate() {
  const { user, initializing } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    return initAuthListener();
  }, []);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === "(auth)";
    const inPatient = segments[0] === "(patient)";
    const inDoctor = segments[0] === "(doctor)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/role-select");
    } else if (user) {
      if (inAuthGroup) {
        router.replace(user.role === "doctor" ? "/(doctor)/home" : "/(patient)/home");
      } else if (user.role === "doctor" && inPatient) {
        router.replace("/(doctor)/home");
      } else if (user.role === "patient" && inDoctor) {
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
