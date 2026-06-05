import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface Repo {
  id: string;
  name: string;
  url: string;
  branch: string;
  needReview: boolean;
  createdAt: number;
}

export function subscribeToRepos(callback: (repos: Repo[]) => void): () => void {
  const q = query(collection(db, "repos"), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Repo))),
    (err) => { console.error("[repos]", err); callback([]); },
  );
}

export async function addRepo(data: Omit<Repo, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "repos"), {
    ...data,
    createdAt: Date.now(),
    _createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRepo(id: string, data: Partial<Omit<Repo, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "repos", id), data);
}

export async function deleteRepo(id: string): Promise<void> {
  await deleteDoc(doc(db, "repos", id));
}

export async function testRepoConnect(url: string): Promise<{ ok: boolean; message: string }> {
  const match = url.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?(?:[/?#]|$)/);
  if (!match) return { ok: false, message: "URL không đúng định dạng GitHub" };
  try {
    const res = await fetch(`https://api.github.com/repos/${match[1]}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "connectdoctor-bot" },
    });
    if (res.ok) {
      const data = await res.json() as { full_name: string; private: boolean };
      return { ok: true, message: `✓ ${data.full_name}${data.private ? " (private)" : ""}` };
    }
    if (res.status === 404) return { ok: false, message: "Repo không tồn tại hoặc private" };
    return { ok: false, message: `Lỗi ${res.status}` };
  } catch {
    return { ok: false, message: "Không kết nối được" };
  }
}
