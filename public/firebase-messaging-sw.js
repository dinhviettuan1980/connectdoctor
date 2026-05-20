importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let messaging = null;

self.addEventListener("message", async (event) => {
  const { type, config, vapidKey, uid } = event.data ?? {};

  // Main thread sends Firebase config on SW registration
  if (type === "FIREBASE_CONFIG") {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      messaging = firebase.messaging();
      messaging.onBackgroundMessage((payload) => {
        const { title, body } = payload.notification ?? {};
        self.registration.showNotification(title ?? "ConnectDoctor", {
          body: body ?? "Bạn có tin nhắn mới",
          icon: "/icon.png",
          badge: "/icon.png",
          data: { threadId: payload.data?.threadId },
        });
      });
    }
    return;
  }

  // Main thread asks SW to get the FCM registration token
  if (type === "GET_FCM_TOKEN" && event.ports[0]) {
    try {
      if (!messaging) {
        event.ports[0].postMessage({ fcmToken: null });
        return;
      }
      const token = await messaging.getToken({ vapidKey });
      event.ports[0].postMessage({ fcmToken: token });
    } catch (e) {
      console.warn("[sw] getToken failed:", e);
      event.ports[0].postMessage({ fcmToken: null });
    }
  }
});

// Notification tap: focus existing tab or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const threadId = event.notification.data?.threadId;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          existing.postMessage({ type: "NOTIFICATION_CLICK", threadId });
        } else {
          self.clients.openWindow(threadId ? `/?threadId=${threadId}` : "/");
        }
      }),
  );
});
