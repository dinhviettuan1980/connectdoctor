import {
  collection, addDoc, deleteDoc, doc,
  query, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "http://localhost:3001";

export interface KnowledgeTrack {
  id: string;
  file: string;       // storage key: "knowledge/01-xxx.m4a"
  title: string;
  duration: string;   // display: "30:23"
  durationMs: number;
  category: string;
  order: number;
  createdAt: number;
}

export function subscribeToKnowledgeTracks(
  callback: (tracks: KnowledgeTrack[]) => void,
): () => void {
  const q = query(collection(db, "knowledgeTracks"), orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snap) =>
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as KnowledgeTrack)),
      ),
    (err) => {
      console.error("[knowledgeTracks]", err);
      callback([]);
    },
  );
}

export async function addKnowledgeTrack(
  data: Omit<KnowledgeTrack, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, "knowledgeTracks"), data);
  return ref.id;
}

export async function deleteKnowledgeTrack(track: KnowledgeTrack): Promise<void> {
  await deleteDoc(doc(db, "knowledgeTracks", track.id));
  // Best-effort delete from storage (ignore errors — file may be seeded directly)
  try {
    await fetch(`${STORAGE_URL}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: track.file }),
    });
  } catch {
    // storage delete is non-fatal
  }
}

export async function uploadTrackFile(
  audioUri: string,
  filename: string,
): Promise<{ url: string; key: string }> {
  const key = `knowledge/${filename}`;
  const res = await fetch(audioUri);
  const blob = await res.blob();
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("key", key);
  const up = await fetch(`${STORAGE_URL}/upload`, { method: "POST", body: form });
  if (!up.ok) throw new Error("Storage upload failed");
  return up.json() as Promise<{ url: string; key: string }>;
}

export function parseDurationMs(str: string): number {
  const parts = str.split(":").map(Number).reverse(); // [s, m?, h?]
  return ((parts[2] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[0] ?? 0)) * 1000;
}
