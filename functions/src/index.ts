import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

interface UserDoc {
  displayName?: string;
  expoPushToken?: string;
  fcmToken?: string;
}

export const onNewChatMessage = onDocumentCreated(
  "/chatThreads/{threadId}/messages/{msgId}",
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { toUid, fromUid, text } = message as {
      toUid: string;
      fromUid: string;
      text?: string;
    };

    const [recipientSnap, senderSnap] = await Promise.all([
      db.doc(`users/${toUid}`).get(),
      db.doc(`users/${fromUid}`).get(),
    ]);

    const recipient = recipientSnap.data() as UserDoc | undefined;
    if (!recipient) return;

    const senderName = (senderSnap.data() as UserDoc | undefined)?.displayName ?? "Ai đó";
    const body = text?.trim() || "Đã gửi một tin nhắn";
    const threadId = event.params.threadId;

    const sends: Promise<unknown>[] = [];

    // ── Expo Push (iOS / Android) ─────────────────────────────────────────────
    if (recipient.expoPushToken?.startsWith("ExponentPushToken")) {
      sends.push(
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify({
            to: recipient.expoPushToken,
            title: senderName,
            body,
            data: { threadId },
            sound: "default",
            channelId: "chat",
          }),
        }).then((r) => r.json()),
      );
    }

    // ── FCM Web Push ──────────────────────────────────────────────────────────
    if (recipient.fcmToken) {
      sends.push(
        messaging.send({
          token: recipient.fcmToken,
          notification: { title: senderName, body },
          data: { threadId },
          webpush: {
            notification: { icon: "/icon.png", badge: "/icon.png" },
            fcmOptions: { link: "/" },
          },
        }),
      );
    }

    const results = await Promise.allSettled(sends);
    results.forEach((r, i) => {
      if (r.status === "rejected") console.error(`[push] send[${i}] failed:`, r.reason);
    });
  },
);
