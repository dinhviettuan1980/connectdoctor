importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

let messaging = null;

// Receive Firebase config from the main thread
self.addEventListener("message", (event) => {
  if (event.data?.type !== "FIREBASE_CONFIG") return;
  if (firebase.apps.length) return; // already initialized
  firebase.initializeApp(event.data.config);
  messaging = firebase.messaging();

  // Handle background push messages (app closed or tab not focused)
  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    self.registration.showNotification(title ?? "ConnectDoctor", {
      body: body ?? "Bạn có tin nhắn mới",
      icon: "/icon.png",
      badge: "/icon.png",
      data: { threadId: payload.data?.threadId },
    });
  });
});

// On notification click: focus existing tab or open new one
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
