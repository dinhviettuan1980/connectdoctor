// Real-time chat service — wraps Firestore chatThreads + messages subcollection.
//
// Thread ID convention: "{patientUid}_{doctorUid}" (deterministic).
// This lets security rules verify membership without a collection-group query.

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  increment,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ChatMessage, ChatThread, Role } from "./types";

export interface ThreadWithNames extends ChatThread {
  otherName: string;
}

function makeThreadId(patientUid: string, doctorUid: string): string {
  return `${patientUid}_${doctorUid}`;
}

// ─── Thread ──────────────────────────────────────────────────────────────────

export async function getOrCreateThread(
  patientUid: string,
  doctorUid: string,
  names?: { patientName: string; doctorName: string },
): Promise<string> {
  const threadId = makeThreadId(patientUid, doctorUid);
  const ref = doc(db, "chatThreads", threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      patientUid,
      doctorUid,
      patientName: names?.patientName ?? "",
      doctorName: names?.doctorName ?? "",
      unreadForPatient: 0,
      unreadForDoctor: 0,
      _createdAt: serverTimestamp(),
    });
  }
  return threadId;
}

export function subscribeToThreads(
  uid: string,
  role: Role,
  callback: (threads: ThreadWithNames[]) => void,
): Unsubscribe {
  const participantField = role === "patient" ? "patientUid" : "doctorUid";
  const nameField = role === "patient" ? "doctorName" : "patientName";

  // No compound orderBy to avoid requiring a composite index.
  // Sort client-side by lastMessageAt desc.
  const q = query(
    collection(db, "chatThreads"),
    where(participantField, "==", uid),
  );

  return onSnapshot(
    q,
    (snap) => {
      const threads: ThreadWithNames[] = snap.docs
        .map((d) => ({
          id: d.id,
          patientUid: d.data().patientUid as string,
          doctorUid: d.data().doctorUid as string,
          lastMessage: d.data().lastMessage as string | undefined,
          lastMessageAt: d.data().lastMessageAt as number | undefined,
          unreadForPatient: d.data().unreadForPatient as number | undefined,
          unreadForDoctor: d.data().unreadForDoctor as number | undefined,
          otherName: (d.data()[nameField] as string) || "Người dùng",
        }))
        .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
      callback(threads);
    },
    (err) => { console.error("[subscribeToThreads]", err); callback([]); },
  );
}

export async function markThreadRead(threadId: string, role: Role): Promise<void> {
  const field = role === "patient" ? "unreadForPatient" : "unreadForDoctor";
  await updateDoc(doc(db, "chatThreads", threadId), { [field]: 0 });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function sendMessage(
  threadId: string,
  fromUid: string,
  toUid: string,
  text: string,
  imageUrl?: string,
  audioUrl?: string,
): Promise<void> {
  const [patientUid] = threadId.split("_");
  const isFromPatient = fromUid === patientUid;
  const now = Date.now();

  await addDoc(collection(db, "chatThreads", threadId, "messages"), {
    fromUid,
    toUid,
    text,
    imageUrl: imageUrl ?? null,
    audioUrl: audioUrl ?? null,
    createdAt: now,
    readAt: null,
  });

  const lastMessage = audioUrl ? "🎤 Tin nhắn thoại" : text;
  await updateDoc(doc(db, "chatThreads", threadId), {
    lastMessage,
    lastMessageAt: now,
    ...(isFromPatient
      ? { unreadForDoctor: increment(1) }
      : { unreadForPatient: increment(1) }),
  });
}

export function subscribeToMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, "chatThreads", threadId, "messages"),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((d) => ({
        id: d.id,
        threadId,
        fromUid: d.data().fromUid as string,
        toUid: d.data().toUid as string,
        text: d.data().text as string | undefined,
        imageUrl: d.data().imageUrl as string | undefined,
        audioUrl: d.data().audioUrl as string | undefined,
        createdAt: d.data().createdAt as number,
        readAt: d.data().readAt as number | undefined,
      }));
      callback(messages);
    },
    (err) => { console.error("[subscribeToMessages]", err); callback([]); },
  );
}

export async function markMessageRead(threadId: string, msgId: string): Promise<void> {
  await updateDoc(
    doc(db, "chatThreads", threadId, "messages", msgId),
    { readAt: Date.now() },
  );
}
