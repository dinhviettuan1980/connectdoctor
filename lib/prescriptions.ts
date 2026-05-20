import {
  collection, addDoc, query, where, onSnapshot, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "./firebase";

// Storage service URL — set EXPO_PUBLIC_STORAGE_URL in .env for production
const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "http://localhost:3001";

export interface PrescriptionPhoto {
  id: string;
  patientUid: string;
  imageUrl: string;
  storageKey: string;
  createdAt: number;
}

export async function uploadPrescriptionImage(
  patientUid: string,
  imageUri: string
): Promise<PrescriptionPhoto> {
  const res = await fetch(imageUri);
  const blob = await res.blob();

  const storageKey = `prescriptions/${patientUid}/${Date.now()}.jpg`;

  const form = new FormData();
  form.append("file", blob, `${Date.now()}.jpg`);
  form.append("key", storageKey);

  const uploadRes = await fetch(`${STORAGE_URL}/upload`, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Storage upload failed");
  const { url } = (await uploadRes.json()) as { url: string; key: string };

  const createdAt = Date.now();
  const docRef = await addDoc(collection(db, "prescriptions"), {
    patientUid,
    imageUrl: url,
    storageKey,
    createdAt,
  });

  return { id: docRef.id, patientUid, imageUrl: url, storageKey, createdAt };
}

export function subscribeToPrescriptions(
  patientUid: string,
  callback: (photos: PrescriptionPhoto[]) => void
): () => void {
  const q = query(
    collection(db, "prescriptions"),
    where("patientUid", "==", patientUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const photos = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as PrescriptionPhoto))
        .sort((a, b) => b.createdAt - a.createdAt);
      callback(photos);
    },
    () => callback([])
  );
}

export async function deletePrescription(id: string, storageKey: string): Promise<void> {
  await deleteDoc(doc(db, "prescriptions", id));
  try {
    await fetch(`${STORAGE_URL}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storageKey }),
    });
  } catch {
    // ignore if storage service unreachable
  }
}
