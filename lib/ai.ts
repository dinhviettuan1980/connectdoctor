// AI helper — calls Gemini for symptom triage and follow-up questions.
// Replace with your provider of choice (OpenAI, Claude, etc.). Keep the
// `askFollowUp` / `triage` signatures so UI screens don't need to change.

import type { AiQuestion } from "./types";

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface TriageResult {
  questions: AiQuestion[];
  specialties: string[];
  conditions: string[];
}

const SYSTEM_PROMPT = `Bạn là trợ lý y tế. Khi bệnh nhân mô tả triệu chứng, hãy:
1) Hỏi 3-4 câu follow-up dưới dạng multiple choice (mỗi câu 3-5 đáp án).
2) Sau khi có đủ thông tin, gợi ý chuyên khoa phù hợp (1-3 khoa) và các bệnh có thể liên quan.
3) Không chẩn đoán dứt khoát. Luôn khuyên gặp bác sỹ.
Trả lời JSON theo schema: { questions: [{prompt, options[]}], specialties: [], conditions: [] }`;

export async function startTriage(complaint: string): Promise<TriageResult> {
  if (!GEMINI_KEY) return mockTriage(complaint);

  // Retry once on 429 after a short delay
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

    let res: Response;
    try {
      res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: complaint }] }],
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
    } catch {
      return mockTriage(complaint);
    }

    if (res.status === 429 && attempt === 0) continue;
    if (!res.ok) return mockTriage(complaint);

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      const parsed = JSON.parse(text) as Partial<TriageResult>;
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return mockTriage(complaint);
      }
      return {
        questions: parsed.questions,
        specialties: parsed.specialties ?? [],
        conditions: parsed.conditions ?? [],
      };
    } catch {
      return mockTriage(complaint);
    }
  }

  return mockTriage(complaint);
}

function mockTriage(complaint: string): TriageResult {
  return {
    questions: [
      {
        prompt: "Triệu chứng xuất hiện được bao lâu rồi?",
        options: ["Dưới 1 ngày", "1-7 ngày", "1-4 tuần", "Hơn 1 tháng"],
      },
      {
        prompt: "Cơn đau/khó chịu thường kéo dài bao lâu?",
        options: ["Dưới 30 phút", "30 phút — 2 giờ", "Cả đêm, đến sáng vẫn còn", "Không cố định"],
      },
      {
        prompt: "Có triệu chứng kèm theo nào sau đây?",
        options: ["Buồn nôn", "Sốt", "Mệt mỏi nhiều", "Không có"],
      },
      {
        prompt: "Bạn đã thử biện pháp gì chưa?",
        options: ["Chưa thử gì", "Thuốc giảm đau OTC", "Đi khám rồi", "Khác"],
      },
    ],
    specialties: ["Thần kinh", "Nội tổng quát"],
    conditions: ["Đau đầu căng cơ", "Migraine", "Rối loạn giấc ngủ"],
  };
}
