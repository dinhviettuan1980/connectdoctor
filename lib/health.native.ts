/**
 * Native health platform implementation (iOS HealthKit + Android Health Connect).
 *
 * This file is loaded by Metro on iOS/Android builds instead of health.ts.
 * It requires:
 *
 * iOS (HealthKit):
 *   npm install react-native-health
 *   Add to ios/Podfile: pod 'RCTAppleHealthKit', :path => '../node_modules/react-native-health'
 *   Add to ios/<App>/Info.plist:
 *     NSHealthShareUsageDescription — why you read health data
 *     NSHealthUpdateUsageDescription — why you write health data
 *   Enable HealthKit capability in Xcode → Signing & Capabilities
 *
 * Android (Health Connect):
 *   npm install react-native-health-connect
 *   Add to android/app/src/main/AndroidManifest.xml:
 *     <uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
 *     <uses-permission android:name="android.permission.health.READ_STEPS"/>
 *     <uses-permission android:name="android.permission.health.READ_SLEEP_SESSION"/>
 *   Health Connect requires Android 14+ or Health Connect APK on older devices.
 *
 * Garmin: Garmin watches sync to Garmin Connect mobile app, which can write
 * to HealthKit (iOS) or Health Connect (Android) automatically. No Garmin SDK
 * is needed in this app — just enable the sync in Garmin Connect settings.
 *
 * This requires bare workflow (npx expo prebuild) or EAS Build.
 * It will NOT work in Expo Go.
 */

import type { HealthService, HeartRateSample, StepSample, SleepSample, HealthPermissions } from "./health";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Placeholder — replace with real SDK calls after installing the packages
// ---------------------------------------------------------------------------

async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  // TODO: import AppleHealthKit from "react-native-health";
  // return await new Promise(r => AppleHealthKit.isAvailable((e, a) => r(a)));
  return false;
}

async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  // TODO: import { getSdkStatus, SdkAvailabilityStatus } from "react-native-health-connect";
  // const status = await getSdkStatus();
  // return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  return false;
}

export const healthService: HealthService = {
  async isAvailable() {
    if (Platform.OS === "ios") return isHealthKitAvailable();
    if (Platform.OS === "android") return isHealthConnectAvailable();
    return false;
  },

  async requestPermissions(types): Promise<HealthPermissions> {
    const result: HealthPermissions = { heartRate: false, steps: false, sleep: false };

    if (Platform.OS === "ios") {
      // TODO: import AppleHealthKit, { HealthKitPermissions } from "react-native-health";
      // const permissions: HealthKitPermissions = {
      //   permissions: {
      //     read: [
      //       ...(types.includes("heartRate") ? [AppleHealthKit.Constants.Permissions.HeartRate] : []),
      //       ...(types.includes("steps") ? [AppleHealthKit.Constants.Permissions.StepCount] : []),
      //       ...(types.includes("sleep") ? [AppleHealthKit.Constants.Permissions.SleepAnalysis] : []),
      //     ],
      //     write: [],
      //   },
      // };
      // await new Promise<void>((res, rej) =>
      //   AppleHealthKit.initHealthKit(permissions, (err) => err ? rej(err) : res())
      // );
      // result.heartRate = types.includes("heartRate");
      // result.steps = types.includes("steps");
      // result.sleep = types.includes("sleep");
    }

    if (Platform.OS === "android") {
      // TODO: import { initialize, requestPermission } from "react-native-health-connect";
      // await initialize();
      // const granted = await requestPermission([
      //   ...(types.includes("heartRate") ? [{ accessType: "read", recordType: "HeartRate" }] : []),
      //   ...(types.includes("steps") ? [{ accessType: "read", recordType: "Steps" }] : []),
      //   ...(types.includes("sleep") ? [{ accessType: "read", recordType: "SleepSession" }] : []),
      // ]);
      // result.heartRate = granted.some(g => g.recordType === "HeartRate");
      // result.steps = granted.some(g => g.recordType === "Steps");
      // result.sleep = granted.some(g => g.recordType === "SleepSession");
    }

    return result;
  },

  async getHeartRateSamples(startMs: number, endMs: number): Promise<HeartRateSample[]> {
    if (Platform.OS === "ios") {
      // TODO: import AppleHealthKit from "react-native-health";
      // const samples = await new Promise<any[]>((res, rej) =>
      //   AppleHealthKit.getHeartRateSamples(
      //     { startDate: new Date(startMs).toISOString(), endDate: new Date(endMs).toISOString() },
      //     (err, results) => err ? rej(err) : res(results)
      //   )
      // );
      // return samples.map(s => ({
      //   value: s.value,
      //   timestamp: new Date(s.startDate).getTime(),
      //   source: s.sourceName ?? "HealthKit",
      // }));
    }

    if (Platform.OS === "android") {
      // TODO: import { readRecords } from "react-native-health-connect";
      // const { records } = await readRecords("HeartRate", {
      //   timeRangeFilter: { operator: "between", startTime: new Date(startMs).toISOString(), endTime: new Date(endMs).toISOString() },
      // });
      // return records.flatMap(r =>
      //   r.samples.map((s: any) => ({
      //     value: s.beatsPerMinute,
      //     timestamp: new Date(s.time).getTime(),
      //     source: r.metadata?.dataOrigin ?? "Health Connect",
      //   }))
      // );
    }

    return [];
  },

  async getStepSamples(startMs: number, endMs: number): Promise<StepSample[]> {
    if (Platform.OS === "ios") {
      // TODO: AppleHealthKit.getDailyStepCountSamples(...)
    }
    if (Platform.OS === "android") {
      // TODO: readRecords("Steps", ...)
    }
    return [];
  },

  async getSleepSamples(startMs: number, endMs: number): Promise<SleepSample[]> {
    if (Platform.OS === "ios") {
      // TODO: AppleHealthKit.getSleepSamples(...)
    }
    if (Platform.OS === "android") {
      // TODO: readRecords("SleepSession", ...)
    }
    return [];
  },
};
