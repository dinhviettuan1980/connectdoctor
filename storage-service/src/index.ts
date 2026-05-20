import path from "path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config";
import { LocalAdapter } from "./adapters/local";
import { MinioAdapter } from "./adapters/minio";
import type { StorageAdapter } from "./adapters/interface";

const app = express();
app.use(cors());
app.use(express.json());

// Pick adapter from config
let adapter: StorageAdapter;
switch (config.adapter) {
  case "minio":
    adapter = new MinioAdapter();
    break;
  default:
    adapter = new LocalAdapter();
}

// Serve uploaded files when using local adapter
if (config.adapter === "local") {
  app.use("/files", express.static(path.resolve(config.local.uploadDir)));
}

const upload = multer({ storage: multer.memoryStorage() });

// POST /upload  — multipart: file (binary) + key (string, optional)
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  const key: string = req.body.key ?? `uploads/${Date.now()}-${req.file.originalname}`;
  try {
    const result = await adapter.upload(key, req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// DELETE /files  — body: { key: string }
app.delete("/files", async (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key) {
    res.status(400).json({ error: "key is required" });
    return;
  }
  try {
    await adapter.delete(key);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// GET /health
app.get("/health", (_req, res) => {
  res.json({ adapter: config.adapter, ok: true });
});

app.listen(config.port, () => {
  console.log(`Storage service [${config.adapter}] → http://localhost:${config.port}`);
});
