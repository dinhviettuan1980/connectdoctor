import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// ── Native (iOS / Android) ────────────────────────────────────────────────────

async function registerNativeToken(uid: string): Promise<void> {
  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("chat", {
      name: "Tin nhắn",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  await updateDoc(doc(db, "users", uid), { expoPushToken: tokenData.data });
}

// ── Web (FCM) ─────────────────────────────────────────────────────────────────

async function registerWebToken(uid: string): Promise<void> {
  const vapidKey = process.env.EXPO_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey) return;

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");
    const { app } = await import("./firebase");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      await updateDoc(doc(db, "users", uid), { fcmToken: token });
    }
  } catch (e) {
    // Service worker not ready or permission denied — non-fatal
    console.warn("[notifications] web FCM:", e);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function registerPushToken(uid: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await registerWebToken(uid);
    } else {
      await registerNativeToken(uid);
    }
  } catch (e) {
    console.warn("[notifications] register failed:", e);
  }
}

export async function getNotificationResponse() {
  if (Platform.OS === "web") return null;
  const Notifications = await import("expo-notifications");
  return Notifications.getLastNotificationResponseAsync();
}

export async function addNotificationListener(
  handler: (notification: { threadId?: string }) => void,
) {
  if (Platform.OS === "web") return () => {};
  const Notifications = await import("expo-notifications");
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    handler({ threadId: data?.threadId as string | undefined });
  });
  return () => sub.remove();
}
