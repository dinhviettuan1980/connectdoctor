import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "./firebase";

export interface GarminRecord {
  calories: string;
  date: string;
  floors: string;
  hr: string;
  steps: string;
  ts: string;
}

export interface DiscoveredDevice {
  id: string;
  lastRecord?: GarminRecord;
}

export async function discoverSyncedDevices(): Promise<DiscoveredDevice[]> {
  const snap = await getDocs(collection(db, "my_data"));
  const devices: DiscoveredDevice[] = [];
  for (const deviceDoc of snap.docs) {
    const device: DiscoveredDevice = { id: deviceDoc.id };
    try {
      const rec = await getDocs(
        query(collection(db, "my_data", deviceDoc.id, "records"), orderBy("ts", "desc"), limit(1))
      );
      if (rec.docs.length > 0) device.lastRecord = rec.docs[0].data() as GarminRecord;
    } catch { /* no records or no access */ }
    devices.push(device);
  }
  return devices;
}

export async function getDeviceRecentRecords(deviceId: string, days = 7): Promise<GarminRecord[]> {
  const cutoff = new Date(Date.now() - days * 86400_000);
  const dateStr = cutoff.toISOString().slice(0, 10);
  try {
    const snap = await getDocs(
      query(
        collection(db, "my_data", deviceId, "records"),
        where("date", ">=", dateStr),
        orderBy("date", "desc"),
      )
    );
    return snap.docs.map((d) => d.data() as GarminRecord);
  } catch {
    return [];
  }
}
