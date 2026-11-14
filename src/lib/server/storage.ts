import "server-only";

function getSupabaseStorageConfig(): { url: string; secretKey: string } {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY environment variables must be configured for file storage.",
    );
  }
  return { url, secretKey };
}

function encodeStoragePath(objectPath: string): string {
  const segments = objectPath.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === "." || s === "..")) {
    throw new Error("Invalid storage path.");
  }
  return segments.map((s) => encodeURIComponent(s)).join("/");
}

export async function uploadObject(
  bucket: string,
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const { url, secretKey } = getSupabaseStorageConfig();
  const encodedBucket = encodeURIComponent(bucket);
  const encodedPath = encodeStoragePath(objectPath);

  const res = await fetch(
    `${url}/storage/v1/object/${encodedBucket}/${encodedPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Storage upload failed (${res.status}): ${detail || res.statusText}`,
    );
  }
}

export async function downloadObject(
  bucket: string,
  objectPath: string,
): Promise<{ buffer: Buffer; contentType: string | null } | null> {
  const { url, secretKey } = getSupabaseStorageConfig();
  const encodedBucket = encodeURIComponent(bucket);
  const encodedPath = encodeStoragePath(objectPath);

  const res = await fetch(
    `${url}/storage/v1/object/${encodedBucket}/${encodedPath}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
      },
    },
  );

  if (res.status === 404 || res.status === 400) {
    return null;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Storage download failed (${res.status}): ${detail || res.statusText}`,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: res.headers.get("content-type"),
  };
}

export async function deleteObject(
  bucket: string,
  objectPath: string,
): Promise<void> {
  const { url, secretKey } = getSupabaseStorageConfig();
  const encodedBucket = encodeURIComponent(bucket);
  const encodedPath = encodeStoragePath(objectPath);

  const res = await fetch(
    `${url}/storage/v1/object/${encodedBucket}/${encodedPath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        apikey: secretKey,
      },
    },
  );

  if (!res.ok && res.status !== 404) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Storage delete failed (${res.status}): ${detail || res.statusText}`,
    );
  }
}
