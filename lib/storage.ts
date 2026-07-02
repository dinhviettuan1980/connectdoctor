export const STORAGE_URL = process.env.EXPO_PUBLIC_STORAGE_URL ?? "https://doctorapi.tuandv.id.vn/storage";

/**
 * The storage server sometimes returns its internal address (e.g. http://localhost:8001/...)
 * when running behind the nginx reverse proxy — that URL is unreachable from the client.
 * Rewrite it to the public STORAGE_URL so uploaded files are always fetchable.
 */
export function resolvePublicStorageUrl(rawUrl: string): string {
  return rawUrl.startsWith("http")
    ? STORAGE_URL + new URL(rawUrl).pathname.replace(/^\/storage/, "")
    : rawUrl;
}
