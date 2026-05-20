import Tesseract from "tesseract.js";

const { data } = await Tesseract.recognize("testdata/xn2.jpg", ["vie", "eng"], {
  logger: (m) => { if (m.status === "recognizing text") process.stdout.write(`\r${Math.round(m.progress * 100)}%  `); },
});

console.log("\n\n=== RAW TEXT ===");
console.log(data.text);
