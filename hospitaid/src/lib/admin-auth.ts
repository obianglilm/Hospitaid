// Authentification admin par mot de passe + jeton signé (HMAC via Web Crypto,
// compatible à la fois avec les Server Actions (Node.js) et le middleware
// (environnement Edge, qui n'a pas accès au module "crypto" de Node ni à Buffer).

const COOKIE_NAME = "hospitaid_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 heures
const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET n'est pas configuré.");
  return secret;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = await hmacHex(getSecret(), payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expiresAtStr, signature] = parts;
  if (role === undefined || expiresAtStr === undefined || signature === undefined) return false;
  const payload = `${role}.${expiresAtStr}`;
  let expected: string;
  try {
    expected = await hmacHex(getSecret(), payload);
  } catch {
    return false;
  }
  if (!constantTimeEqual(signature, expected)) return false;
  const expiresAt = Number(expiresAtStr);
  return role === "admin" && Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE = MAX_AGE_SECONDS;
