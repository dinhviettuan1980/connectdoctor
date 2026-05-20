/**
 * Health platform sync — abstract interface.
 *
 * On web/Expo Go: this file is used directly (returns mock data so the UI
 * renders without crashing).
 *
 * On iOS/Android EAS Build: Metro resolves lib/health.native.ts instead,
 * which bridges to Apple HealthKit and Android Health Connect.
 *
 * To enable real device sync:
 *   1. Switch to bare workflow: `npx expo prebuild`
 *   2. Install native SDKs: see lib/health.native.ts
 *   3. Build with EAS: `eas build --platform ios` / `eas build --platform android`
 */

export interface HeartRateSample {
  value: number;       // bpm
  timestamp: number;   // Unix ms
  source: string;      // e.g. "Apple Watch", "Garmin Forerunner", "Manual"
}

export interface StepSample {
  value: number;       // steps
  startTime: number;   // Unix ms
  endTime: number;     // Unix ms
  source: string;
}

export interface SleepSample {
  startTime: number;
  endTime: number;
  stage: "awake" | "light" | "deep" | "rem" | "unknown";
  source: string;
}

export interface HealthPermissions {
  heartRate: boolean;
  steps: boolean;
  sleep: boolean;
}

export interface HealthService {
  /** Returns true if the platform SDK is available (always false on web). */
  isAvailable(): Promise<boolean>;

  /** Request user permissions for the specified data types. */
  requestPermissions(types: (keyof HealthPermissions)[]): Promise<HealthPermissions>;

  /** Fetch heart rate samples within [startMs, endMs]. */
  getHeartRateSamples(startMs: number, endMs: number): Promise<HeartRateSample[]>;

  /** Fetch step count samples within [startMs, endMs]. */
  getStepSamples(startMs: number, endMs: number): Promise<StepSample[]>;

  /** Fetch sleep sessions within [startMs, endMs]. */
  getSleepSamples(startMs: number, endMs: number): Promise<SleepSample[]>;
}

// ---------------------------------------------------------------------------
// Web / Expo Go mock implementation
// ---------------------------------------------------------------------------

function mockHeartRate(startMs: number, endMs: number): HeartRateSample[] {
  const samples: HeartRateSample[] = [];
  // one sample per hour in range, realistic resting/active variation
  const step = 60 * 60 * 1000;
  for (let t = startMs; t <= endMs; t += step) {
    const hour = new Date(t).getHours();
    // higher during waking hours (8–22)
    const base = hour >= 8 && hour <= 22 ? 72 : 58;
    const jitter = Math.round((Math.random() - 0.5) * 14);
    samples.push({ value: base + jitter, timestamp: t, source: "Mock (Expo Go)" });
  }
  return samples;
}

function mockSteps(startMs: number, endMs: number): StepSample[] {
  const samples: StepSample[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = startMs; t < endMs; t += dayMs) {
    samples.push({
      value: 4000 + Math.round(Math.random() * 6000),
      startTime: t,
      endTime: Math.min(t + dayMs, endMs),
      source: "Mock (Expo Go)",
    });
  }
  return samples;
}

export const healthService: HealthService = {
  async isAvailable() { return false; },

  async requestPermissions() {
    return { heartRate: false, steps: false, sleep: false };
  },

  async getHeartRateSamples(startMs, endMs) {
    return mockHeartRate(startMs, endMs);
  },

  async getStepSamples(startMs, endMs) {
    return mockSteps(startMs, endMs);
  },

  async getSleepSamples() {
    return [];
  },
};
