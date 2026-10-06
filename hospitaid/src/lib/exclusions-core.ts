// Prestations non prises en charge par la CNAMGS (ex. soins infirmiers « AMI »).
// Configurable par l'admin ; par défaut : lettre-clé AMI et visite d'infirmier.
export const EXCLUSIONS_KEY = "coverage_exclusions";

export interface CoverageExclusions {
  letterCodes: string[]; // lettres-clés des actes techniques (ex. "AMI")
  consultationCodes: string[]; // codes de consultations/prestations (ex. "CONS_INFIRMIER")
}

export const DEFAULT_EXCLUSIONS: CoverageExclusions = {
  letterCodes: ["AMI"],
  consultationCodes: ["CONS_INFIRMIER"],
};

function stringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && /^[A-Za-z0-9_]{1,40}$/.test(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

/** Valeur absente ou illisible → réglage par défaut ; sinon la liste enregistrée (même vide). */
export function parseExclusions(value: unknown): CoverageExclusions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_EXCLUSIONS;
  const v = value as { letterCodes?: unknown; consultationCodes?: unknown };
  return { letterCodes: stringList(v.letterCodes), consultationCodes: stringList(v.consultationCodes) };
}

export function isExamExcluded(ex: CoverageExclusions, letterCode: string | null | undefined): boolean {
  return !!letterCode && ex.letterCodes.includes(letterCode);
}

export function isConsultationExcluded(ex: CoverageExclusions, code: string): boolean {
  return ex.consultationCodes.includes(code);
}
