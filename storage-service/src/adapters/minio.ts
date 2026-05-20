import * as Minio from "minio";
import { StorageAdapter, UploadResult } from "./interface";
import { config } from "../config";

const PUBLIC_POLICY = (bucket: string) =>
  JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  });

export class MinioAdapter implements StorageAdapter {
  private client: Minio.Client;
  private bucket = config.minio.bucket;

  constructor() {
    this.client = new Minio.Client({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      await this.client.setBucketPolicy(this.bucket, PUBLIC_POLICY(this.bucket));
    }
  }

  async upload(key: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    await this.ensureBucket();
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      "Content-Type": mimeType,
    });
    const url = `${config.minio.publicUrl}/${this.bucket}/${key}`;
    return { url, key };
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
