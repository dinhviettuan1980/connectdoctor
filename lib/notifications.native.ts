import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushToken(uid: string): Promise<void> {
  try {
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
  } catch (e) {
    console.warn("[notifications] register failed:", e);
  }
}

export async function getNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export async function addNotificationListener(
  handler: (notification: { threadId?: string }) => void,
): Promise<() => void> {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    handler({ threadId: data?.threadId as string | undefined });
  });
  return () => sub.remove();
}
