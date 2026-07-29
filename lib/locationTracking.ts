// Web stub — expo-location and expo-task-manager are native-only.
// Metro resolves to locationTracking.native.ts on iOS/Android.

export const LOCATION_TASK = "connectdoctor-bg-location";

export interface LocationPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  ts: number;
  date: string;
}

export function setTrackingUid(_uid: string | null) {}
export async function requestLocationPermissions(): Promise<boolean> { return false; }
export async function startLocationTracking(_uid: string): Promise<void> {}
export async function stopLocationTracking(): Promise<void> {}
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> { return null; }
