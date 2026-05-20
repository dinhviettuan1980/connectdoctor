// Web-only implementation — Metro uses this for web builds.
// Native builds use notifications.native.ts instead.
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

function registerWebToken(uid: string): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const vapidKey = process.env.EXPO_PUBLIC_FCM_VAPID_KEY;
  if (!vapidKey) return;

  navigator.serviceWorker.ready.then((reg) => {
    const sw = reg.active;
    if (!sw) return;

    const channel = new MessageChannel();
    channel.port1.onmessage = async (event) => {
      const token = event.data?.fcmToken as string | undefined;
      if (token) {
        await updateDoc(doc(db, "users", uid), { fcmToken: token });
      }
    };
    sw.postMessage({ type: "GET_FCM_TOKEN", vapidKey }, [channel.port2]);
  }).catch(() => {});
}

export async function registerPushToken(uid: string): Promise<void> {
  registerWebToken(uid);
}

export async function getNotificationResponse(): Promise<null> {
  return null;
}

export async function addNotificationListener(
  handler: (notification: { threadId?: string }) => void,
): Promise<() => void> {
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "NOTIFICATION_CLICK") {
      handler({ threadId: event.data.threadId });
    }
  };
  navigator.serviceWorker?.addEventListener("message", listener);
  return () => navigator.serviceWorker?.removeEventListener("message", listener);
}
