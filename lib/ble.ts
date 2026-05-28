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

async function getFirestoreDeviceIds(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, "my_data"));
    return snap.docs.map((d) => d.id);
  } catch {
    return [];
  }
}

function correlate(devices: HealthDevice[], fsIds: string[]): HealthDevice[] {
  if (devices.length === 1 && fsIds.length === 1) {
    devices[0].firestoreId = fsIds[0];
  } else {
    devices.forEach((d, i) => {
      if (!d.firestoreId) d.firestoreId = fsIds[i];
    });
  }
  return devices;
}

// Standard BLE service UUIDs that Garmin watches expose.
// retrieveConnectedPeripherals requires at least one service to filter by.
const GARMIN_SERVICES = [
  "180A", // Device Information — exposed by virtually all Garmin watches
  "180D", // Heart Rate
  "180F", // Battery
  "6A4E3200-667B-11E3-949A-0800200C9A66", // Garmin proprietary sync service
];

function deviceToHealth(d: Device): HealthDevice {
  return {
    bleId: d.id,
    name: d.name ?? d.localName ?? "Unknown Device",
    rssi: d.rssi ?? -99,
  };
}

export async function scanForHealthDevices(
  onFound: (devices: HealthDevice[]) => void,
): Promise<() => void> {
  const mgr = getManager();

  const state = await mgr.state();
  if (state !== State.PoweredOn) {
    onFound([]);
    return () => {};
  }

  const [fsIds, connected] = await Promise.all([
    getFirestoreDeviceIds(),
    // retrieveConnectedPeripherals — finds already-bonded devices (e.g. watch paired via Garmin Connect)
    mgr.connectedDevices(GARMIN_SERVICES).catch(() => [] as Device[]),
  ]);

  const found = new Map<string, HealthDevice>();

  for (const d of connected) {
    found.set(d.id, deviceToHealth(d));
  }

  if (found.size > 0) {
    onFound(correlate(Array.from(found.values()), fsIds));
  }

  // Also do an active scan to catch devices not yet bonded
  mgr.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error || !device) return;
    // Show all devices with a name so user can identify their watch
    const name = device.name ?? device.localName ?? "";
    if (!name) return;
    found.set(device.id, deviceToHealth(device));
    onFound(correlate(Array.from(found.values()), fsIds));
  });

  const timer = setTimeout(() => {
    mgr.stopDeviceScan();
    onFound(correlate(Array.from(found.values()), fsIds));
  }, 8000);

  return () => {
    clearTimeout(timer);
    mgr.stopDeviceScan();
  };
}

export function stopScan() {
  manager?.stopDeviceScan();
}
