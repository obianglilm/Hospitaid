// Authentification admin par mot de passe + jeton signé (HMAC via Web Crypto,
// compatible à la fois avec les Server Actions (Node.js) et le middleware
// (environnement Edge).
import { constantTimeEqual, getSessionSecret, hmacHex } from "./crypto-utils";

const COOKIE_NAME = "hospitaid_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 heures

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expiresAt}`;
  const signature = await hmacHex(getSessionSecret(), payload);
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
    expected = await hmacHex(getSessionSecret(), payload);
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
