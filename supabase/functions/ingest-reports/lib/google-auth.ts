// Autenticación con Google APIs vía Service Account (JWT bearer flow).
// No usamos librerías externas: armamos y firmamos el JWT con Web Crypto.

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE =
  "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly";

// Helper: base64url sin padding (lo que pide JWT).
function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) {
    bytes = new Uint8Array(data);
  } else {
    bytes = data;
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Convierte una clave PEM PKCS#8 a un ArrayBuffer crudo para importKey.
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// Devuelve un access_token válido por ~1 hora.
export async function getAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
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

  // La private_key suele venir con \n escapados cuando se pega en una env var.
  const privateKeyPem = sa.private_key.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: sa.token_uri ?? GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Importamos la clave privada como PKCS#8 para firmar con RS256.
  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;

  // Cambio JWT por access_token.
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch(sa.token_uri ?? GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Falló el intercambio de JWT por access_token (${res.status}): ${text}`,
    );
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("La respuesta de Google no contiene access_token");
  }
  return data.access_token;
}
