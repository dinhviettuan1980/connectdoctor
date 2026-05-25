import * as Notifications from "expo-notifications";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(uid: string): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await updateDoc(doc(db, "users", uid), { expoPushToken: token }).catch(() => {});
}

export async function getNotificationResponse(): Promise<null> {
  return null;
}

export async function addNotificationListener(
  handler: (notification: { threadId?: string }) => void,
): Promise<() => void> {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const threadId = response.notification.request.content.data?.threadId as string | undefined;
    handler({ threadId });
  });
  return () => sub.remove();
}

// ── Medication reminders ────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleMedicationReminder(
  id: string,
  label: string,
  hour: number,
  minute: number,
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  // Fire 5 minutes before the target time
  let rMin = minute - 5;
  let rHour = hour;
  if (rMin < 0) { rMin += 60; rHour = (hour - 1 + 24) % 24; }

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "⏰ Nhắc uống thuốc",
      body: `${label} — còn 5 phút nữa là ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: rHour,
      minute: rMin,
    },
  });
}

export async function cancelMedicationReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
