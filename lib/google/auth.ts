import crypto from "node:crypto";

// Autenticación con Google Drive vía Service Account (JWT bearer flow), en
// Node. Espeja el approach de la edge function de ingesta pero usando el
// `crypto` de Node. Sólo lectura: el frontend lista y baja del banco/videos;
// la ESCRITURA del MP4 la hace el worker con su propia credencial.

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

function base64Url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// El token vale ~1h; lo cacheamos en memoria del proceso para no re-firmar
// en cada request.
let cached: { token: string; expiresAt: number } | null = null;

export async function getDriveAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("Falta la env var GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  let sa: ServiceAccountJson;
  try {
    sa = JSON.parse(raw) as ServiceAccountJson;
  } catch (err) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido: ${(err as Error).message}`,
    );
  }

  const privateKey = sa.private_key.replace(/\\n/g, "\n");
  const tokenUri = sa.token_uri ?? GOOGLE_TOKEN_URL;
  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey);
  const jwt = `${signingInput}.${base64Url(signature)}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Google token endpoint respondió ${res.status}: ${await res.text()}`,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}
