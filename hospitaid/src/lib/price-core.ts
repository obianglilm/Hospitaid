// Marges d'établissement et ajustements de prix décidés par l'admin (logique pure).
export const MAX_MARGIN_PERCENT = 300;
export const MAX_AMOUNT = 100_000_000;

/** Prix facturé = prix de base majoré de la marge de l'établissement (arrondi au FCFA). */
export function applyMargin(baseBilled: number, marginPercent: number): number {
  return Math.round((baseBilled * (100 + marginPercent)) / 100);
}

export interface OverrideRow {
  scope: string;
  kind: string;
  targetKey: string;
  referenceAmount: number | null;
  billedAmount: number | null;
}

/** L'ajustement propre à un établissement l'emporte sur l'ajustement « tous établissements ». */
export function pickOverride(
  rows: OverrideRow[],
  facilityId: string,
  kind: "EXAM" | "CONSULTATION",
  targetKey: string
): OverrideRow | null {
  const mine = rows.find((r) => r.kind === kind && r.targetKey === targetKey && r.scope === facilityId);
  if (mine) return mine;
  return rows.find((r) => r.kind === kind && r.targetKey === targetKey && r.scope === "ALL") ?? null;
}

/**
 * Montants retenus pour une prestation.
 * - reference : tarif conventionné (base de remboursement CNAMGS) ; l'ajustement admin le remplace.
 * - baseBilled : prix facturé de référence de l'établissement (null = égal au tarif conventionné).
 * - billed : l'ajustement admin s'il existe, sinon baseBilled majoré de la marge.
 * Retourne null si aucun tarif conventionné n'est connu.
 */
export function resolveAmounts(p: {
  reference: number | null;
  baseBilled: number | null;
  marginPercent: number;
  override: Pick<OverrideRow, "referenceAmount" | "billedAmount"> | null;
}): { reference: number; billed: number; adjusted: boolean } | null {
  const reference = p.override?.referenceAmount ?? p.reference;
  if (reference === null || reference === undefined) return null;
  const base = p.baseBilled ?? reference;
  const billed = p.override?.billedAmount ?? applyMargin(base, p.marginPercent);
  return { reference, billed, adjusted: p.override !== null || p.marginPercent !== 0 };
}

/** Entier de FCFA entre 0 et MAX_AMOUNT, ou null (champ vide ou invalide). */
export function parseAmount(raw: string): number | null {
  const v = raw.replace(/[\s\u00a0\u202f]/g, "");
  if (!/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n <= MAX_AMOUNT ? n : null;
}

/** Marge en % (entier de 0 à MAX_MARGIN_PERCENT), ou null si invalide. */
export function parseMargin(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d)?$/.test(v)) return null;
  const n = Math.round(Number(v));
  return n >= 0 && n <= MAX_MARGIN_PERCENT ? n : null;
}
