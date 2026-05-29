import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { LocationPoint } from "@/lib/locationTracking";

export type { LocationPoint };

export async function fetchLocationHistory(uid: string, date: string): Promise<LocationPoint[]> {
  const ref = collection(db, "locationRecords", uid, "points");
  const q = query(ref, where("date", "==", date), orderBy("ts", "asc"), limit(2000));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LocationPoint);
}

export async function fetchRecentLocationDays(uid: string, days = 7): Promise<LocationPoint[]> {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  const results = await Promise.all(dates.map((date) => fetchLocationHistory(uid, date)));
  return results.flat();
}
