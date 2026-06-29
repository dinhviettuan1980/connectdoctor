// OCR helper — dùng Groq vision qua OCR service (key giữ ở server, không lộ ở client).
// Endpoint: POST /prescription (đơn thuốc), POST /labtest (chỉ số xét nghiệm).

import { Platform } from "react-native";
import type { Medication, MetricEntry } from "./types";

// Ánh xạ 'type' từ backend -> MetricType của app.
const TYPE_MAP: Record<string, MetricEntry["type"]> = {
  blood_test: "blood_test",
  blood_pressure: "blood_pressure",
  cholesterol: "cholesterol",
  glucose: "blood_glucose",
  blood_glucose: "blood_glucose",
  heart_rate: "heart_rate",
  urine_test: "urine_test",
  other: "custom",
};

const OCR_API =
  process.env.EXPO_PUBLIC_OCR_API || "https://tuandv80-ocr-numbers.hf.space";

async function postImage(endpoint: string, imageUri: string): Promise<any> {
  const fd = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(imageUri)).blob();
    fd.append("file", blob, "image.jpg");
  } else {
    // React Native: append dạng { uri, name, type }
    fd.append("file", { uri: imageUri, name: "image.jpg", type: "image/jpeg" } as any);
  }
  const res = await fetch(`${OCR_API}/${endpoint}`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`OCR ${endpoint} HTTP ${res.status}`);
  return res.json();
}

export async function extractMedsFromImage(imageUri: string): Promise<Partial<Medication>[]> {
  try {
    const data = await postImage("prescription", imageUri);
    return (data.meds || [])
      .filter((m: any) => m?.name)
      .map((m: any) => {
        const qty = [m.quantity, m.unit].filter(Boolean).join(" ").trim();
        const dose = [m.dose, qty && `SL ${qty}`].filter(Boolean).join(" · ");
        return { name: m.name, dose, category: m.category || undefined };
      });
  } catch (e) {
    console.warn("extractMedsFromImage error", e);
    return [];
  }
}

export async function extractMetricsFromImage(imageUri: string): Promise<Partial<MetricEntry>[]> {
  try {
    const data = await postImage("labtest", imageUri);
    const now = Date.now();
    return (data.metrics || [])
      .filter((m: any) => m?.label)
      .map((m: any) => ({
        type: TYPE_MAP[m.type] || "custom",
        label: m.label,
        value: [m.value, m.unit].filter(Boolean).join(" "),
        unit: m.unit || undefined,
        measuredAt: now,
      }));
  } catch (e) {
    console.warn("extractMetricsFromImage error", e);
    return [];
  }
}
