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

// ── Web (FCM via service worker message) ─────────────────────────────────────
// firebase/messaging cannot be imported directly in Metro — the token is
// obtained inside the service worker and posted back to the main thread.

function registerWebToken(uid: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const vapidKey = process.env.EXPO_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey) return;

  navigator.serviceWorker.ready.then(async (reg) => {
    try {
      // Ask the SW to get the FCM token and post it back
      const sw = reg.active;
      if (!sw) return;

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = async (event) => {
        const token = event.data?.fcmToken as string | undefined;
        if (token) {
          await updateDoc(doc(db, "users", uid), { fcmToken: token });
        }
      };
      sw.postMessage({ type: "GET_FCM_TOKEN", vapidKey, uid }, [messageChannel.port2]);
    } catch (e) {
      console.warn("[notifications] web FCM token:", e);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function registerPushToken(uid: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      registerWebToken(uid);
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
): Promise<() => void> {
  if (Platform.OS === "web") {
    // Listen for NOTIFICATION_CLICK messages from the service worker
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK") {
        handler({ threadId: event.data.threadId });
      }
    };
    navigator.serviceWorker?.addEventListener("message", listener);
    return () => navigator.serviceWorker?.removeEventListener("message", listener);
  }
  const Notifications = await import("expo-notifications");
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    handler({ threadId: data?.threadId as string | undefined });
  });
  return () => sub.remove();
}
