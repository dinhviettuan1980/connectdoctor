import "dotenv/config";

export type AdapterType = "local" | "minio" | "firebase";

export const config = {
  adapter: (process.env.STORAGE_ADAPTER ?? "local") as AdapterType,
  port: parseInt(process.env.PORT ?? "3001", 10),

  local: {
    uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
    baseUrl: process.env.LOCAL_BASE_URL ?? "http://localhost:3001/files",
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "connectdoctor",
    publicUrl: process.env.MINIO_PUBLIC_URL ?? "http://localhost:9000",
  },
};
