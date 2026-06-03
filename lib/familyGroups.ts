import {
  collection, doc, addDoc, updateDoc, arrayUnion, arrayRemove,
  query, where, orderBy, onSnapshot, deleteDoc, serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { FamilyGroup } from "./types";

export interface GroupMessage {
  id: string;
  fromUid: string;
  fromName: string;
  text: string;
  createdAt: number;
}

export async function createFamilyGroup(name: string, ownerUid: string, ownerName: string): Promise<string> {
  const ref = await addDoc(collection(db, "familyGroups"), {
    name,
    ownerUid,
    members: [ownerUid],
    memberNames: { [ownerUid]: ownerName },
    createdAt: Date.now(),
    _createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameFamilyGroup(groupId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "familyGroups", groupId), { name });
}

export async function addMember(groupId: string, uid: string, name: string): Promise<void> {
  await updateDoc(doc(db, "familyGroups", groupId), {
    members: arrayUnion(uid),
    [`memberNames.${uid}`]: name,
  });
}

export async function removeMember(groupId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "familyGroups", groupId), {
    members: arrayRemove(uid),
  });
}

export async function deleteFamilyGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, "familyGroups", groupId));
}

export function subscribeToUserGroups(uid: string, callback: (groups: FamilyGroup[]) => void): Unsubscribe {
  const q = query(collection(db, "familyGroups"), where("members", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FamilyGroup, "id">) }))),
    () => callback([]),
  );
}

export function subscribeToGroup(groupId: string, callback: (group: FamilyGroup | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "familyGroups", groupId),
    (snap) => callback(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<FamilyGroup, "id">) }) : null),
    () => callback(null),
  );
}

export async function sendGroupMessage(groupId: string, fromUid: string, fromName: string, text: string): Promise<void> {
  const now = Date.now();
  await addDoc(collection(db, "familyGroups", groupId, "messages"), {
    fromUid, fromName, text, createdAt: now,
  });
  await updateDoc(doc(db, "familyGroups", groupId), {
    lastMessage: text,
    lastMessageAt: now,
  });
}

/**
 * Sync the current user's `locationSharedWith` so all peers in `peerUids`
 * (e.g. all other members of a family group) can read the user's tracking.
 * Each user manages their OWN sharing consent — Firestore rules only allow
 * a user to write to their own /users/{uid} doc.
 */
export async function shareLocationWith(selfUid: string, peerUids: string[]): Promise<void> {
  const toAdd = peerUids.filter((u) => u !== selfUid);
  if (toAdd.length === 0) return;
  await updateDoc(doc(db, "users", selfUid), {
    locationSharedWith: arrayUnion(...toAdd),
  }).catch(() => {});
}

export async function unshareLocationWith(selfUid: string, peerUids: string[]): Promise<void> {
  if (peerUids.length === 0) return;
  await updateDoc(doc(db, "users", selfUid), {
    locationSharedWith: arrayRemove(...peerUids),
  }).catch(() => {});
}

export function subscribeToGroupMessages(groupId: string, callback: (msgs: GroupMessage[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "familyGroups", groupId, "messages"), orderBy("createdAt", "asc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GroupMessage, "id">) }))),
    () => callback([]),
  );
}
