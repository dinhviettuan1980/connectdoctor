import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Medication } from "./types";
import { STORAGE_URL, resolvePublicStorageUrl } from "./storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PrescriptionImage {
  url: string;
  storageKey: string;
}

export interface Prescription {
  id: string;
  patientUid: string;
  /** Cấu trúc từng thuốc — nguồn dữ liệu chính (theo dõi liều / nhắc uống). */
  meds: Medication[];
  /** Ghi chú tự do: tên bác sĩ, phòng khám, lý do tái khám… (KHÔNG còn dùng để chứa danh sách thuốc). */
  note: string;
  images: PrescriptionImage[];
  createdAt: number; // used as the display name / title
  updatedAt: number;
}

/** Sinh id cục bộ cho thuốc nhúng trong 1 đơn (đồng bộ trong cùng lần lưu). */
export function makeMedId(i = 0): string {
  return `${Date.now()}-${i}`;
}

/**
 * Firestore từ chối field value `undefined` ở bất kỳ đâu trong dữ liệu ghi (kể cả lồng trong mảng).
 * `category` là field optional hay bị set thành `undefined` (thuốc không có nhóm) — bỏ hẳn key thay vì
 * giữ `undefined` để tránh lỗi "updateDoc() called with invalid data".
 */
function sanitizeMeds(meds: Medication[]): Medication[] {
  return meds.map(({ category, ...rest }) => (category ? { ...rest, category } : rest) as Medication);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadToStorage(patientUid: string, imageUri: string): Promise<PrescriptionImage> {
  const res = await fetch(imageUri);
  const blob = await res.blob();
  const storageKey = `prescriptions/${patientUid}/${Date.now()}.jpg`;
  const form = new FormData();
  form.append("file", blob, `${Date.now()}.jpg`);
  form.append("key", storageKey);
  const up = await fetch(`${STORAGE_URL}/upload`, { method: "POST", body: form });
  if (!up.ok) throw new Error("Storage upload failed");
  const { url } = (await up.json()) as { url: string };
  return { url: resolvePublicStorageUrl(url), storageKey };
}

async function deleteFromStorage(storageKey: string): Promise<void> {
  try {
    await fetch(`${STORAGE_URL}/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: storageKey }),
    });
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createPrescription(
  patientUid: string,
  meds: Medication[] = [],
  note = ""
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, "prescriptions"), {
    patientUid, meds: sanitizeMeds(meds), note, images: [], createdAt: now, updatedAt: now,
  });
  return ref.id;
}

export async function updatePrescriptionNote(id: string, note: string): Promise<void> {
  await updateDoc(doc(db, "prescriptions", id), { note, updatedAt: Date.now() });
}

export async function updatePrescriptionMeds(id: string, meds: Medication[]): Promise<void> {
  await updateDoc(doc(db, "prescriptions", id), { meds: sanitizeMeds(meds), updatedAt: Date.now() });
}

export async function addImageToPrescription(
  prescriptionId: string,
  patientUid: string,
  imageUri: string
): Promise<void> {
  const image = await uploadToStorage(patientUid, imageUri);
  await updateDoc(doc(db, "prescriptions", prescriptionId), {
    images: arrayUnion(image),
    updatedAt: Date.now(),
  });
}

export async function removeImageFromPrescription(
  prescriptionId: string,
  image: PrescriptionImage
): Promise<void> {
  await updateDoc(doc(db, "prescriptions", prescriptionId), {
    images: arrayRemove(image),
    updatedAt: Date.now(),
  });
  await deleteFromStorage(image.storageKey);
}

export async function deletePrescription(prescription: Prescription): Promise<void> {
  await deleteDoc(doc(db, "prescriptions", prescription.id));
  for (const img of prescription.images) {
    await deleteFromStorage(img.storageKey);
  }
}

export function subscribeToPrescriptions(
  patientUid: string,
  callback: (items: Prescription[]) => void
): () => void {
  const q = query(collection(db, "prescriptions"), where("patientUid", "==", patientUid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            meds: Array.isArray(data.meds) ? data.meds : [],
            images: Array.isArray(data.images) ? data.images : [],
          } as Prescription;
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      callback(items);
    },
    () => callback([])
  );
}
