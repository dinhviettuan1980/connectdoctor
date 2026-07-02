import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, getDocs,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  scheduleMedicationReminder,
  cancelMedicationReminder,
} from "./notifications";

export interface MedicationSchedule {
  id: string;
  label: string;   // "Uống thuốc sáng"
  hour: number;    // 0–23
  minute: number;  // 0–59
  enabled: boolean;
  prescriptionId?: string | null;
  meds?: string[]; // tên các thuốc cần uống ở buổi này — hiện trong nội dung thông báo
  createdAt: number;
}

function col(uid: string) {
  return collection(db, "users", uid, "medicationSchedules");
}

export function subscribeToSchedules(
  uid: string,
  cb: (schedules: MedicationSchedule[]) => void,
): () => void {
  return onSnapshot(
    query(col(uid), orderBy("createdAt", "asc")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MedicationSchedule))),
    () => cb([]),
  );
}

/** One-shot fetch (không phải realtime) — dùng khi cần đọc rồi ghi lại ngay, ví dụ thay hết lịch nhắc cũ. */
export async function getSchedulesOnce(uid: string): Promise<MedicationSchedule[]> {
  const snap = await getDocs(query(col(uid), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MedicationSchedule));
}

export async function addSchedule(
  uid: string,
  label: string,
  hour: number,
  minute: number,
  prescriptionId?: string | null,
  meds?: string[],
): Promise<string> {
  const ref = await addDoc(col(uid), {
    label, hour, minute, enabled: true,
    prescriptionId: prescriptionId ?? null,
    ...(meds && meds.length > 0 ? { meds } : {}),
    createdAt: Date.now(),
  });
  await scheduleMedicationReminder(ref.id, label, hour, minute, prescriptionId, meds);
  return ref.id;
}

export async function updateSchedule(
  uid: string,
  id: string,
  fields: Partial<Pick<MedicationSchedule, "label" | "hour" | "minute" | "enabled" | "prescriptionId" | "meds">>,
): Promise<void> {
  await updateDoc(doc(col(uid), id), fields as Record<string, unknown>);
  // Reschedule or cancel based on enabled state
  if (fields.enabled === false) {
    await cancelMedicationReminder(id);
  } else {
    // Fetch latest to reschedule with correct values — caller passes full updated values
    if (fields.hour !== undefined && fields.minute !== undefined && fields.label !== undefined) {
      await scheduleMedicationReminder(id, fields.label, fields.hour, fields.minute, fields.prescriptionId, fields.meds);
    }
  }
}

export async function deleteSchedule(uid: string, id: string): Promise<void> {
  await cancelMedicationReminder(id);
  await deleteDoc(doc(col(uid), id));
}
