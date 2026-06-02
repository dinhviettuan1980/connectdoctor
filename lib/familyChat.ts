import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, increment,
  query, orderBy, onSnapshot, serverTimestamp, where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FamilyMessage {
  id: string;
  fromUid: string;
  toUid: string;
  text: string;
  createdAt: number;
  readAt?: number | null;
}

export interface FamilyThread {
  id: string;
  participants: [string, string];
  lastMessage?: string;
  lastMessageAt?: number;
  unread: Record<string, number>;
  names: Record<string, string>;
}

export function makeFamilyThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

export async function getOrCreateFamilyThread(
  selfUid: string, selfName: string,
  otherUid: string, otherName: string,
): Promise<string> {
  const threadId = makeFamilyThreadId(selfUid, otherUid);
  const ref = doc(db, "familyChats", threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants: [selfUid, otherUid].sort(),
      names: { [selfUid]: selfName, [otherUid]: otherName },
      unread: { [selfUid]: 0, [otherUid]: 0 },
      _createdAt: serverTimestamp(),
    });
  }
  return threadId;
}

export async function sendFamilyMessage(
  threadId: string, fromUid: string, toUid: string, text: string,
): Promise<void> {
  const now = Date.now();
  await addDoc(collection(db, "familyChats", threadId, "messages"), {
    fromUid, toUid, text, createdAt: now, readAt: null,
  });
  await updateDoc(doc(db, "familyChats", threadId), {
    lastMessage: text,
    lastMessageAt: now,
    [`unread.${toUid}`]: increment(1),
  });
}

export function subscribeToFamilyMessages(
  threadId: string,
  callback: (msgs: FamilyMessage[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "familyChats", threadId, "messages"), orderBy("createdAt", "asc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyMessage, "id">) }))),
    () => callback([]),
  );
}

export async function markFamilyThreadRead(threadId: string, selfUid: string): Promise<void> {
  await updateDoc(doc(db, "familyChats", threadId), { [`unread.${selfUid}`]: 0 }).catch(() => {});
}
