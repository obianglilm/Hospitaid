// Logique pure autour des noms d'examens et de la recherche (testable sans base).

/** Minuscules, sans accents, sans ponctuation : « Glycémie » → « glycemie ». */
export function normalizeText(s: string): string {
  return s
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTokens(query: string, max = 6): string[] {
  return normalizeText(query).split(" ").filter((t) => t.length > 0).slice(0, max);
}

export function buildSearchText(parts: {
  officialName: string;
  displayName?: string | null;
  synonyms?: string[];
  code?: string | null;
}): string {
  return normalizeText(
    [parts.officialName, parts.displayName ?? "", ...(parts.synonyms ?? []), parts.code ?? ""].join(" ")
  );
}

export const MAX_DISPLAY_NAME = 200;
export const MAX_SYNONYMS = 20;
export const MAX_SYNONYM_LENGTH = 80;

/** Nom usuel saisi par l'admin : espaces nettoyés, vide → null (retour au libellé officiel). */
export function cleanDisplayName(raw: string): string | null {
  const v = raw.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME);
  return v.length > 0 ? v : null;
}

/** « glycémie, sucre ; taux de sucre » → ["glycémie", "sucre", "taux de sucre"] (sans doublons). */
export function parseSynonyms(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[,;\n]/)) {
    const v = piece.replace(/\s+/g, " ").trim().slice(0, MAX_SYNONYM_LENGTH);
    if (v.length < 2) continue;
    const key = normalizeText(v);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= MAX_SYNONYMS) break;
  }
  return out;
}

export interface RankInput {
  label: string; // nom affiché
  synonyms: string[];
}

/** Plus le score est bas, plus le résultat est pertinent. */
export function relevanceScore(item: RankInput, query: string): number {
  const q = normalizeText(query);
  if (q.length === 0) return 9;
  const label = normalizeText(item.label);
  const syns = item.synonyms.map(normalizeText);
  if (syns.includes(q) || label === q) return 0;
  if (label.startsWith(q) || syns.some((s) => s.startsWith(q))) return 1;
  if (label.includes(q) || syns.some((s) => s.includes(q))) return 2;
  return 3;
}
