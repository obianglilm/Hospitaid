// Session des utilisateurs (patients) : jeton signé HMAC dans un cookie HttpOnly.
// Format : user.<userId>.<expiration>.<signature>. Les jetons admin ont 3 segments
// (admin.<expiration>.<signature>) : les deux types ne sont pas interchangeables.
import { constantTimeEqual, getSessionSecret, hmacHex } from "./crypto-utils";

export const USER_COOKIE_NAME = "hospitaid_user";
export const USER_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 jours

export async function createUserToken(userId: string): Promise<string> {
  const expiresAt = Date.now() + USER_COOKIE_MAX_AGE * 1000;
  const payload = `user.${userId}.${expiresAt}`;
  const signature = await hmacHex(getSessionSecret(), payload);
  return `${payload}.${signature}`;
}

/** Retourne l'identifiant de l'utilisateur si le jeton est valide, sinon null. */
export async function verifyUserToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [role, userId, expiresAtStr, signature] = parts;
  if (role !== "user" || !userId || expiresAtStr === undefined || signature === undefined) return null;
  const payload = `${role}.${userId}.${expiresAtStr}`;
  let expected: string;
  try {
    expected = await hmacHex(getSessionSecret(), payload);
  } catch {
    return null;
  }
  if (!constantTimeEqual(signature, expected)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;
  return userId;
}
