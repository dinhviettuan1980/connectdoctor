const API_BASE = "https://doctorapi.tuandv.id.vn";
// Prototype: secret baked in so the app works without extra config. Must match backend.
const SECRET = "c3a526524e98a56e26a9f7b04e26e74b99cdac75c980b9db";

export async function notify(subject: string, body = ""): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ subject, body }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch (err) {
    console.error("[notify]", err);
    return false;
  }
}

export interface ReminderSyncItem {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  meds?: string[];
}

/**
 * Đồng bộ toàn bộ lịch nhắc thuốc của user lên doctorapi — server tự nhắc qua Telegram
 * (và Expo push nếu có expoPushToken) đúng giờ, không phụ thuộc app có mở/có quyền
 * notification trên máy hay không. Gọi lại (full-replace theo uid) mỗi khi lịch thay đổi.
 */
export async function syncMedicationReminders(
  uid: string,
  schedules: ReminderSyncItem[],
  expoPushToken?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/medication-reminders/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ uid, schedules, expoPushToken }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch (err) {
    console.error("[syncMedicationReminders]", err);
    return false;
  }
}

export type MealTime = "Sáng" | "Chiều" | "Tối";

/**
 * Phân loại thuốc vào buổi Sáng/Chiều/Tối bằng AI (Groq, qua doctorapi) thay vì keyword-matching.
 * Trả về null nếu gọi lỗi — caller nên fallback về suy luận cục bộ.
 */
export async function classifyMedTimes(
  meds: { name: string; dose?: string }[],
): Promise<Record<MealTime, string[]> | null> {
  try {
    const res = await fetch(`${API_BASE}/classify-meds`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-secret": SECRET },
      body: JSON.stringify({ meds }),
    });
    const json = await res.json();
    if (!json.ok || !json.schedule) return null;
    return json.schedule;
  } catch (err) {
    console.error("[classifyMedTimes]", err);
    return null;
  }
}
