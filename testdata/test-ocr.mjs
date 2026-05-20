import { readFileSync } from "fs";

const GEMINI_KEY = "AIzaSyBfKq3EMqv9tGURhmcUeYu1rfIhVd4Qn10";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const base64 = readFileSync("testdata/xn1.jpg").toString("base64");

const body = {
  contents: [{
    role: "user",
    parts: [
      { inlineData: { mimeType: "image/jpeg", data: base64 } },
      { text: `Đọc phiếu xét nghiệm trong ảnh. Chỉ lấy các chỉ số ĐÃ CÓ KẾT QUẢ (cột Kết quả không trống).
Trả lời JSON: {"metrics":[{"label":"tên chỉ số","value":"giá trị","unit":"đơn vị"}]}.
Nếu không có kết quả nào thì trả về {"metrics":[]}.` }
    ]
  }],
  generationConfig: { responseMimeType: "application/json" }
};

console.log("Đang gửi ảnh tới Gemini...");
const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log("HTTP status:", res.status);
const data = await res.json();

if (!res.ok) {
  console.error("Lỗi API:", data.error?.message);
  process.exit(1);
}

const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
const parsed = JSON.parse(text);

console.log("\n=== KẾT QUẢ OCR ===");
if (parsed.metrics?.length === 0) {
  console.log("Không tìm thấy kết quả xét nghiệm (ảnh là mẫu trắng chưa điền).");
} else {
  parsed.metrics?.forEach((m, i) => {
    console.log(`${i + 1}. ${m.label}: ${m.value} ${m.unit}`);
  });
}
console.log("\nRaw JSON:", JSON.stringify(parsed, null, 2));
