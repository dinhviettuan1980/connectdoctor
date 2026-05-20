export interface UploadResult {
  url: string;
  key: string;
}

export interface StorageAdapter {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult>;
  delete(key: string): Promise<void>;
}
