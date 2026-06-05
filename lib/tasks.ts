import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type TaskStatus = "pending" | "waiting" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress?: string;     // agent's live progress note while working
  result?: string;       // agent's summary after completing
  commitMessage?: string;
  repos?: string[];      // repo IDs this task is associated with
  createdAt: number;
  updatedAt: number;
}

export function subscribeToTasks(callback: (tasks: Task[]) => void): () => void {
  const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task))),
    (err) => { console.error("[tasks]", err); callback([]); },
  );
}

export async function addTask(title: string, description: string, repos: string[] = []): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    title,
    description,
    repos,
    status: "pending" as TaskStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    _createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(id: string, data: Partial<Omit<Task, "id">>): Promise<void> {
  await updateDoc(doc(db, "tasks", id), { ...data, updatedAt: Date.now() });
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(db, "tasks", id));
}
