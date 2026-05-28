// BLE scanning — native only. Web stub exported from ble.web.ts
import { BleManager, State, type Device } from "react-native-ble-plx";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface HealthDevice {
  bleId: string;         // CoreBluetooth UUID (iOS-assigned)
  name: string;          // Advertised name e.g. "Garmin Forerunner 255 S"
  rssi: number;
  firestoreId?: string;  // Matched my_data document ID e.g. "006-B4024-00"
}

let manager: BleManager | null = null;

function getManager(): BleManager {
  if (!manager) manager = new BleManager();
  return manager;
}

export async function requestBluetoothPermission(): Promise<boolean> {
  const mgr = getManager();
  const state = await mgr.state();
  return state === State.PoweredOn;
}

// Fetch all device IDs that have synced data in my_data collection
async function getFirestoreDeviceIds(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, "my_data"));
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isGarmin(device: Device): boolean {
  const name = (device.name ?? device.localName ?? "").toLowerCase();
  if (name.includes("garmin")) return true;
  if (device.manufacturerData) {
    try {
      const bytes = base64ToBytes(device.manufacturerData);
      // First 2 bytes = company ID little-endian; 0x0001 = Garmin Ltd
      const companyId = bytes[0] + (bytes[1] << 8);
      if (companyId === 1) return true;
    } catch { /* ignore */ }
  }
  return false;
}

export function scanForHealthDevices(
  onFound: (devices: HealthDevice[]) => void,
  durationMs = 8000,
): () => void {
  const mgr = getManager();
  const found = new Map<string, HealthDevice>();

  // Fetch Firestore device IDs in parallel
  getFirestoreDeviceIds().then((fsIds) => {
    // Re-emit with Firestore IDs correlated
    for (const [id, dev] of found) {
      if (!dev.firestoreId && fsIds.length === 1) {
        // If exactly one Garmin in BLE and one in Firestore — auto-match
        found.set(id, { ...dev, firestoreId: fsIds[0] });
      }
    }
    onFound(Array.from(found.values()));
  });

  mgr.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error || !device) return;
    if (!isGarmin(device)) return;

    const entry: HealthDevice = {
      bleId: device.id,
      name: device.name ?? device.localName ?? "Garmin Watch",
      rssi: device.rssi ?? -99,
    };
    found.set(device.id, entry);
    onFound(Array.from(found.values()));
  });

  const timer = setTimeout(() => {
    mgr.stopDeviceScan();
    // Final emit with Firestore correlation
    getFirestoreDeviceIds().then((fsIds) => {
      const garminDevices = Array.from(found.values());
      if (garminDevices.length === 1 && fsIds.length === 1) {
        garminDevices[0].firestoreId = fsIds[0];
      } else if (fsIds.length > 0) {
        // Multiple: try name-based match or assign sequentially
        garminDevices.forEach((d, i) => {
          if (!d.firestoreId) d.firestoreId = fsIds[i] ?? undefined;
        });
      }
      onFound(garminDevices);
    });
  }, durationMs);

  return () => {
    clearTimeout(timer);
    mgr.stopDeviceScan();
  };
}

export function stopScan() {
  manager?.stopDeviceScan();
}
