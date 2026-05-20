import fs from "fs";
import path from "path";
import { StorageAdapter, UploadResult } from "./interface";
import { config } from "../config";

export class LocalAdapter implements StorageAdapter {
  private uploadDir = path.resolve(config.local.uploadDir);

  constructor() {
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    const absPath = path.join(this.uploadDir, key);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buffer);
    return { url: `${config.local.baseUrl}/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(this.uploadDir, key);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  }
}
