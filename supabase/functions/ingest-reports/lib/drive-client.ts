// Cliente mínimo para Google Drive y Google Sheets, vía fetch nativo.
// Solo usamos lectura: listar archivos en una carpeta y bajar valores de un sheet.

const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files?: Array<{
    id: string;
    name: string;
    modifiedTime: string;
    mimeType: string;
  }>;
}

interface SheetValuesResponse {
  values?: string[][];
}

// Lista los Google Sheets dentro de una carpeta de Drive, ordenados por fecha
// de modificación descendente (el más reciente primero).
export async function listFilesInFolder(
  accessToken: string,
  folderId: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: "modifiedTime desc",
    fields: "files(id,name,modifiedTime,mimeType)",
    pageSize: "100",
  });

  const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Drive list falló para folder ${folderId} (${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as DriveListResponse;
  const files = data.files ?? [];
  return files
    .filter((f) => f.mimeType === SHEET_MIME)
    .map(({ id, name, modifiedTime }) => ({ id, name, modifiedTime }));
}

// Lee un rango de un sheet y devuelve la matriz de valores (strings).
export async function readSheet(
  accessToken: string,
  spreadsheetId: string,
  range = "A:Z",
): Promise<string[][]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}/values/${encodeURIComponent(range)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Sheets read falló para ${spreadsheetId} (${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as SheetValuesResponse;
  return data.values ?? [];
}
