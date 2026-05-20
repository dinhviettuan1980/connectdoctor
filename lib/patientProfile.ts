import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { PatientProfile } from "./types";

export async function getPatientProfile(uid: string): Promise<PatientProfile | null> {
  const snap = await getDoc(doc(db, "patientProfiles", uid));
  if (!snap.exists()) return null;
  return snap.data() as PatientProfile;
}

// setDoc with merge:true works for both create and partial update
export async function savePatientProfile(
  uid: string,
  data: Partial<Omit<PatientProfile, "uid">>,
): Promise<void> {
  await setDoc(doc(db, "patientProfiles", uid), data, { merge: true });
}
