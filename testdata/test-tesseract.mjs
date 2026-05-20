import Tesseract from "tesseract.js";
import { readFileSync } from "fs";

const imgPath = "testdata/xn1.jpg";
console.log("Đang nhận dạng ảnh bằng Tesseract (vie+eng)...");

const { data } = await Tesseract.recognize(imgPath, ["vie", "eng"], {
  logger: (m) => { if (m.status === "recognizing text") process.stdout.write(`\r${Math.round(m.progress * 100)}%  `); },
});

console.log("\n\n=== VĂN BẢN NHẬN DẠNG ===");
console.log(data.text);

// Simple parser for lab result rows: label  value  unit
const UNITS = "mmol\\/L|mg\\/dL|U\\/L|IU\\/L|g\\/L|g\\/dL|µmol\\/L|umol\\/L|nmol\\/L|ng\\/mL|pg\\/mL|fL|fl|%";
const re = new RegExp(
  `([A-Za-z\\u00C0-\\u1EF9][A-Za-z\\u00C0-\\u1EF9\\d\\s\\-\\.]{1,39}?)\\s+([\\d][\\d.,]*)\\s*(${UNITS})`,
  "gi"
);

const metrics = [];
const seen = new Set();
let m;
while ((m = re.exec(data.text)) !== null) {
  const label = m[1].replace(/\s+/g, " ").trim();
  if (label.length < 2 || seen.has(label.toLowerCase())) continue;
  seen.add(label.toLowerCase());
  metrics.push({ label, value: m[2].replace(",", "."), unit: m[3] });
}

console.log("\n=== CHỈ SỐ PHÁT HIỆN ===");
if (metrics.length === 0) {
  console.log("Không tìm thấy chỉ số nào (ảnh có thể là mẫu trắng chưa điền).");
} else {
  metrics.forEach((r, i) => console.log(`${i + 1}. ${r.label}: ${r.value} ${r.unit}`));
}
