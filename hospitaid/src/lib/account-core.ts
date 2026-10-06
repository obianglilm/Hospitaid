// Validation des saisies liées aux comptes (logique pure, testable sans base).
import type { CoverageType } from "./pricing-core";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const COVERAGES: CoverageType[] = ["EXONERE", "PLEIN", "PLEIN_ALD", "PAF"];

/** E-mail nettoyé en minuscules, ou null s'il n'est pas valide. */
export function normalizeEmail(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (v.length === 0 || v.length > 254 || !EMAIL_RE.test(v)) return null;
  return v;
}

const RESERVED_USERNAMES = ["admin", "administrateur", "administrator", "hospitaid", "root"];

/**
 * Identifiant de connexion : sans accents, en minuscules, espaces remplacés par « . ».
 * « Marie Ndong » → « marie.ndong ». Retourne null s'il est invalide (3 à 30 caractères :
 * lettres, chiffres, point, tiret, souligné).
 */
export function normalizeUsername(raw: string): string | null {
  const v = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".");
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(v)) return null;
  if (RESERVED_USERNAMES.includes(v)) return null;
  return v;
}

/** Identifiant saisi à la connexion : nom d'utilisateur, ou e-mail pour les anciens comptes. */
export function parseLoginIdentifier(raw: string): { kind: "email" | "username"; value: string } | null {
  if (raw.includes("@")) {
    const e = normalizeEmail(raw);
    return e ? { kind: "email", value: e } : null;
  }
  const u = normalizeUsername(raw);
  return u ? { kind: "username", value: u } : null;
}

export function cleanName(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  return v.length > 0 ? v : null;
}

export function parseCoverage(raw: string): CoverageType | null {
  return COVERAGES.find((c) => c === raw) ?? null;
}

/** Évite les redirections vers un autre site : seul un chemin interne est accepté. */
export function safeNextPath(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/mon-compte";
  if (raw.startsWith("/admin")) return "/mon-compte";
  return raw.slice(0, 200);
}

/** Libellés lisibles d'un historique de simulation stocké en JSON. */
export function summarizeLines(lines: unknown): string[] {
  if (!Array.isArray(lines)) return [];
  const out: string[] = [];
  for (const l of lines) {
    if (typeof l === "object" && l !== null && typeof (l as { label?: unknown }).label === "string") {
      out.push((l as { label: string }).label);
    }
  }
  return out;
}
