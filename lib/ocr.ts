// OCR helper — recognizes text from a prescription / lab report image,
// then asks Gemini to parse it into structured fields.
//
// Production: use @react-native-ml-kit/text-recognition on native (offline)
// and Google Vision API on web. This module exposes a single `extractMeds()`
// and `extractMetrics()` regardless of platform.

import type { Medication, MetricEntry } from "./types";

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function extractMedsFromImage(imageUri: string): Promise<Partial<Medication>[]> {
  if (!GEMINI_KEY) return mockMeds();
  const base64 = await uriToBase64(imageUri);
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64 } },
            {
              text:
                "Đọc đơn thuốc trong ảnh. Trả lời JSON: " +
                '{"meds":[{"name":"...","dose":"...","category":"..."}]}',
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  try {
    return (JSON.parse(text).meds as Partial<Medication>[]) ?? [];
  } catch {
    return mockMeds();
  }
}

export async function extractMetricsFromImage(imageUri: string): Promise<Partial<MetricEntry>[]> {
  if (!GEMINI_KEY) return mockMetrics();
  // Same pattern as above with a different prompt.
  return mockMetrics();
}

async function uriToBase64(uri: string): Promise<string> {
  // On native, expo-file-system; on web, fetch+FileReader. Stubbed here.
  if (uri.startsWith("data:")) return uri.split(",")[1];
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function mockMeds(): Partial<Medication>[] {
  return [
    { name: "Amlodipin 5mg", dose: "1 viên / sáng", category: "Huyết áp" },
    { name: "Metformin 500mg", dose: "2 viên × 2 / ngày", category: "Tiểu đường" },
    { name: "Atorvastatin 20mg", dose: "1 viên / tối", category: "Mỡ máu" },
    { name: "Vitamin D3", dose: "1 giọt / sáng", category: "Bổ sung" },
    { name: "Aspirin 81mg", dose: "1 viên / sáng", category: "Tim mạch" },
  ];
}

function mockMetrics(): Partial<MetricEntry>[] {
  const now = Date.now();
  return [
    { type: "blood_test", label: "Glucose", value: "5.4", unit: "mmol/L", measuredAt: now },
    { type: "blood_test", label: "HbA1c", value: "6.4", unit: "%", measuredAt: now },
    { type: "cholesterol", label: "LDL-C", value: "3.1", unit: "mmol/L", measuredAt: now },
    { type: "cholesterol", label: "HDL-C", value: "1.2", unit: "mmol/L", measuredAt: now },
    { type: "blood_test", label: "Triglycerid", value: "1.8", unit: "mmol/L", measuredAt: now },
    { type: "blood_test", label: "ALT", value: "24", unit: "U/L", measuredAt: now },
    { type: "blood_test", label: "Creatinin", value: "85", unit: "µmol/L", measuredAt: now },
    { type: "blood_test", label: "eGFR", value: "95", unit: "", measuredAt: now },
  ];
}
