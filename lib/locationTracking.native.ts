import { Platform } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const LOCATION_TASK = "connectdoctor-bg-location";

export interface LocationPoint {
  lat: number;
  lng: number;
  altitude: number | null;
  speed: number | null;   // m/s
  accuracy: number | null;
  ts: number;             // unix seconds
  date: string;           // YYYY-MM-DD
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Stored outside the task so the handler can reference uid set by the app.
// TaskManager tasks run in a separate JS context on some platforms — we use
// a global here as the simplest cross-context solution for background saves.
let _uid: string | null = null;

export function setTrackingUid(uid: string | null) {
  _uid = uid;
}

// Register the background task at module-load time (required by TaskManager).
if (Platform.OS !== "web") {
  TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error || !data) return;
    const uid = _uid;
    if (!uid) return;

    for (const loc of data.locations) {
      const point: LocationPoint = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        altitude: loc.coords.altitude ?? null,
        speed: loc.coords.speed ?? null,
        accuracy: loc.coords.accuracy ?? null,
        ts: Math.round(loc.timestamp / 1000),
        date: todayString(),
      };
      try {
        await addDoc(collection(db, "locationRecords", uid, "points"), {
          ...point,
          createdAt: serverTimestamp(),
        });
      } catch {
        // silently ignore write failures in background
      }
    }
  });
}

export async function requestLocationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") return false;

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === "granted";
}

export async function startLocationTracking(uid: string): Promise<void> {
  if (Platform.OS === "web") return;

  _uid = uid;

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (already) return;

  const granted = await requestLocationPermissions();
  if (!granted) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,   // 5 minutes
    distanceInterval: 50,            // or every 50 m, whichever comes first
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "ConnectDoctor đang ghi vị trí",
      notificationBody: "Lịch sử di chuyển được lưu tự động mỗi 5 phút.",
      notificationColor: "#5eb594",
    },
  });
}

export async function stopLocationTracking(): Promise<void> {
  if (Platform.OS === "web") return;
  _uid = null;
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
