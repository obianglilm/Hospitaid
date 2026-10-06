// Hachage des mots de passe : PBKDF2-HMAC-SHA256 (Web Crypto), sel aléatoire par
// mot de passe. Format stocké : pbkdf2$<itérations>$<sel hex>$<hash hex>.
import { constantTimeEqual, fromHex, toHex } from "./crypto-utils";

const ITERATIONS = 600_000; // recommandation OWASP pour PBKDF2-HMAC-SHA256
const HASH_BYTES = 32;
const encoder = new TextEncoder();

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    HASH_BYTES * 8
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2] ?? "");
  const expected = parts[3] ?? "";
  if (!Number.isInteger(iterations) || iterations < 1 || !salt) return false;
  const actual = await derive(password, salt, iterations);
  return constantTimeEqual(actual, expected);
}

// Empreinte factice, utilisée pour faire le même travail quand l'e-mail est
// inconnu (évite de révéler par le temps de réponse quels e-mails existent).
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("mot-de-passe-factice-hospitaid");
  return dummyHash;
}

export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890", "000000", "0000000", "00000000",
  "111111", "11111111", "password", "motdepasse", "azerty", "azerty123", "qwerty", "qwerty123",
  "abcdef", "hospitaid", "gabon", "libreville",
]);

/**
 * Règles volontairement simples : une date de naissance (ex. 15031985) est acceptée.
 * On écarte seulement les mots de passe triviaux. Retourne le message d'erreur, ou null.
 */
export function passwordProblem(password: string, identifier: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Le mot de passe ne peut pas dépasser ${MAX_PASSWORD_LENGTH} caractères.`;
  if (password.toLowerCase() === identifier.toLowerCase()) return "Le mot de passe ne doit pas être identique à l'identifiant.";
  if (/^(.)\1+$/.test(password)) return "Choisissez un mot de passe moins prévisible.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Ce mot de passe est trop courant. Choisissez-en un autre.";
  return null;
}
