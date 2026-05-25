import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
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

export async function addSchedule(
  uid: string,
  label: string,
  hour: number,
  minute: number,
): Promise<string> {
  const ref = await addDoc(col(uid), {
    label, hour, minute, enabled: true, createdAt: Date.now(),
  });
  await scheduleMedicationReminder(ref.id, label, hour, minute);
  return ref.id;
}

export async function updateSchedule(
  uid: string,
  id: string,
  fields: Partial<Pick<MedicationSchedule, "label" | "hour" | "minute" | "enabled">>,
): Promise<void> {
  await updateDoc(doc(col(uid), id), fields as Record<string, unknown>);
  // Reschedule or cancel based on enabled state
  if (fields.enabled === false) {
    await cancelMedicationReminder(id);
  } else {
    // Fetch latest to reschedule with correct values — caller passes full updated values
    if (fields.hour !== undefined && fields.minute !== undefined && fields.label !== undefined) {
      await scheduleMedicationReminder(id, fields.label, fields.hour, fields.minute);
    }
  }
}

export async function deleteSchedule(uid: string, id: string): Promise<void> {
  await cancelMedicationReminder(id);
  await deleteDoc(doc(col(uid), id));
}
