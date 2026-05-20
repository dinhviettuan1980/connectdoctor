// Native push notifications — requires expo-notifications to be installed.
// Install when ready to deploy: npx expo install expo-notifications
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function registerPushToken(_uid: string): Promise<void> {
  // expo-notifications not installed yet — install when upgrading to Blaze plan
  console.log("[notifications] expo-notifications not installed, skipping token registration");
}

export async function getNotificationResponse(): Promise<null> {
  return null;
}

export async function addNotificationListener(
  _handler: (notification: { threadId?: string }) => void,
): Promise<() => void> {
  return () => {};
}
