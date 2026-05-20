"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNewChatMessage = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();
exports.onNewChatMessage = (0, firestore_1.onDocumentCreated)("/chatThreads/{threadId}/messages/{msgId}", async (event) => {
    var _a, _b, _c, _d;
    const message = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!message)
        return;
    const { toUid, fromUid, text } = message;
    const [recipientSnap, senderSnap] = await Promise.all([
        db.doc(`users/${toUid}`).get(),
        db.doc(`users/${fromUid}`).get(),
    ]);
    const recipient = recipientSnap.data();
    if (!recipient)
        return;
    const senderName = (_c = (_b = senderSnap.data()) === null || _b === void 0 ? void 0 : _b.displayName) !== null && _c !== void 0 ? _c : "Ai đó";
    const body = (text === null || text === void 0 ? void 0 : text.trim()) || "Đã gửi một tin nhắn";
    const threadId = event.params.threadId;
    const sends = [];
    // ── Expo Push (iOS / Android) ─────────────────────────────────────────────
    if ((_d = recipient.expoPushToken) === null || _d === void 0 ? void 0 : _d.startsWith("ExponentPushToken")) {
        sends.push(fetch("https://exp.host/--/api/v2/push/send", {
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
        }).then((r) => r.json()));
    }
    // ── FCM Web Push ──────────────────────────────────────────────────────────
    if (recipient.fcmToken) {
        sends.push(messaging.send({
            token: recipient.fcmToken,
            notification: { title: senderName, body },
            data: { threadId },
            webpush: {
                notification: { icon: "/icon.png", badge: "/icon.png" },
                fcmOptions: { link: "/" },
            },
        }));
    }
    const results = await Promise.allSettled(sends);
    results.forEach((r, i) => {
        if (r.status === "rejected")
            console.error(`[push] send[${i}] failed:`, r.reason);
    });
});
//# sourceMappingURL=index.js.map