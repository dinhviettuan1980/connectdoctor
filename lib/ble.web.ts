// Web stub — BLE not supported on web
export interface HealthDevice {
  bleId: string;
  name: string;
  rssi: number;
  firestoreId?: string;
}

export async function requestBluetoothPermission(): Promise<boolean> { return false; }

export async function scanForHealthDevices(
  _onFound: (devices: HealthDevice[]) => void,
): Promise<() => void> { return () => {}; }

export function stopScan() {}
