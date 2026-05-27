import { getDriveAccessToken } from "./auth";

// Cliente mínimo de Google Drive (sólo lectura) para el motor de contenido:
// listar imágenes del banco, bajar bytes para el análisis de Claude vision, y
// hacer streaming del MP4/imagen al navegador desde las API routes.

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files?: Array<{
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
  }>;
}

/** Lista las imágenes (mimeType image/*) dentro de una carpeta de Drive. */
export async function listImagesInFolder(
  folderId: string,
): Promise<DriveImage[]> {
  const token = await getDriveAccessToken();
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
    orderBy: "createdTime desc",
    fields: "files(id,name,mimeType,modifiedTime)",
    pageSize: "200",
  });
  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `Drive list falló para folder ${folderId} (${res.status}): ${await res.text()}`,
    );
  }
  const data = (await res.json()) as DriveListResponse;
  return data.files ?? [];
}

/** Baja un archivo de Drive como Buffer + su mimeType (para Claude vision). */
export async function downloadDriveFile(
  fileId: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await driveMediaResponse(fileId);
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mimeType };
}

/**
 * Devuelve la Response cruda del contenido de un archivo de Drive (alt=media),
 * para hacer streaming directo al navegador desde una route (video/imagen).
 */
export async function driveMediaResponse(fileId: string): Promise<Response> {
  const token = await getDriveAccessToken();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(
      `Drive download falló para ${fileId} (${res.status}): ${await res.text()}`,
    );
  }
  return res;
}
