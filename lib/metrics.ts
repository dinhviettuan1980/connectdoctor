import {
  collection, addDoc, deleteDoc, doc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MetricEntry, MetricType } from "./types";

export async function addMetric(
  patientUid: string,
  type: MetricType,
  label: string,
  value: string,
  unit?: string,
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, "metrics"), {
    patientUid, type, label, value,
    unit: unit ?? null,
    source: "manual",
    measuredAt: now,
    createdAt: now,
  });
  return ref.id;
}

export async function deleteMetric(id: string): Promise<void> {
  await deleteDoc(doc(db, "metrics", id));
}

// Loads all metrics for the patient; filter by type in the component.
// Single-field where avoids composite index requirement.
export function subscribeToMetrics(
  patientUid: string,
  callback: (entries: MetricEntry[]) => void,
): () => void {
  const q = query(collection(db, "metrics"), where("patientUid", "==", patientUid));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MetricEntry)));
    },
    (err) => { console.error("[subscribeToMetrics]", err); callback([]); },
  );
}
