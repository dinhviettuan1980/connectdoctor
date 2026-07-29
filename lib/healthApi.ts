import type { LocationPoint } from "./locationApi";

const API_BASE = "https://api.tuandv.id.vn";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type HealthSyncRecord = {
  id: number;
  device: string;
  steps: number;
  calories: number;
  hr: number;
  floors: number;
  date: string;
  ts: number;
  spo2: number;
  stress: number;
  resp_rate: number;
  created_at: string;
  // GPS fields (added later — may be absent or 0)
  lat?: number;          // latitude × 1,000,000
  lng?: number;          // longitude × 1,000,000
  altitude?: number;     // metres
  speed_kmh?: number;
  distance_m?: number;
  floors_down?: number;
  active_min?: number;
  battery?: number;
};

export type HealthAlertRecord = {
  id: number;
  device: string;
  hr: number;
  ts: number;
  spo2: number;
  stress: number;
  resp_rate: number;
  activity: number;
  created_at: string;
};

export type HealthDailySummary = {
  id: number;
  device: string;
  date: string;
  avg_hr: number | null;
  min_hr: number | null;
  max_hr: number | null;
  resting_hr: number | null;
  total_steps: number | null;
  max_calories: number | null;
  avg_stress: number | null;
  avg_spo2: number | null;
  alert_count: number;
};

export function fetchHealthDevices(): Promise<string[]> {
  return apiFetch<string[]>("/api/health-devices");
}

export function fetchHealthHistory(device: string): Promise<HealthSyncRecord[]> {
  return apiFetch<HealthSyncRecord[]>(`/api/health-sync/history?device=${encodeURIComponent(device)}`);
}

export function fetchHealthAlerts(device: string, date?: string): Promise<HealthAlertRecord[]> {
  const q = date ? `device=${encodeURIComponent(device)}&date=${date}` : `device=${encodeURIComponent(device)}`;
  return apiFetch<HealthAlertRecord[]>(`/api/health-alerts/history?${q}`);
}

export function fetchHealthDaily(device: string, days = 7): Promise<HealthDailySummary[]> {
  return apiFetch<HealthDailySummary[]>(`/api/health-daily?device=${encodeURIComponent(device)}&days=${days}`);
}

// Đồng hồ Garmin (qua HanoiWatch) chỉ gửi vị trí CACHED gần nhất mỗi lần đồng bộ (5 phút/lần) —
// không chủ động bật GPS. Không phải record nào cũng có lat/lng (tuỳ máy có định vị gần đây hay
// không) — trả null để lọc bỏ ở nơi gọi.
export function healthRecordToLocationPoint(r: HealthSyncRecord): LocationPoint | null {
  if (r.lat == null || r.lng == null) return null;
  return {
    lat: r.lat / 1_000_000,
    lng: r.lng / 1_000_000,
    altitude: r.altitude ?? null,
    speed: r.speed_kmh != null ? r.speed_kmh / 3.6 : null,
    accuracy: null,
    ts: r.ts,
    date: r.date,
  };
}
