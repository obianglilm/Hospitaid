// Cœur du calcul de tarification — fonctions pures (aucun accès base de données).
// Formule officielle (Annexe 1 de la Nomenclature CNAMGS) :
//   montant pris en charge = tarif conventionné × taux de prise en charge
//   ticket modérateur       = tarif facturé − montant pris en charge
// Dans le secteur public, tarif facturé = tarif conventionné. Dans le privé,
// le dépassement (facturé − conventionné) reste entièrement à la charge du patient.
// Les arrondis suivent ceux des tableaux du document (arrondi au FCFA, 0,5 vers le haut).

export type CoverageType = "EXONERE" | "PLEIN" | "PLEIN_ALD" | "PAF";

export const COVERAGE_LABELS: Record<CoverageType, { label: string; meta: string }> = {
  EXONERE: { label: "Exonéré", meta: "Femme enceinte déclarée" },
  PLEIN: { label: "Plein", meta: "Affection courante" },
  PLEIN_ALD: { label: "Plein — ALD", meta: "Affection de longue durée" },
  PAF: { label: "PAF", meta: "Particulier à ses frais (non assuré)" },
};

// Taux de prise en charge CNAMGS par défaut (utilisés si la base n'a pas de règle).
export const DEFAULT_COVERAGE_RATES: Record<CoverageType, number> = {
  EXONERE: 100,
  PLEIN: 80,
  PLEIN_ALD: 90,
  PAF: 0,
};

export class PricingError extends Error {}

export function calculateTicketModerateur(params: {
  referenceAmount: number;
  facilityBilledAmount: number;
  coverageRatePercent: number;
}): { amountCoveredByCnamgs: number; ticketModerateur: number } {
  const { referenceAmount, facilityBilledAmount, coverageRatePercent } = params;
  if (
    !(referenceAmount >= 0) ||
    !(facilityBilledAmount >= 0) ||
    !(coverageRatePercent >= 0) ||
    coverageRatePercent > 100
  ) {
    throw new PricingError("Paramètres de calcul invalides.");
  }
  // Calcul en entiers (×100) pour éviter toute erreur d'arrondi flottant.
  const coveredX100 = referenceAmount * coverageRatePercent; // = covered × 100
  const amountCoveredByCnamgs = Math.round(coveredX100 / 100);
  const ticketX100 = facilityBilledAmount * 100 - coveredX100; // = ticket × 100
  const ticketModerateur = Math.max(0, Math.round(ticketX100 / 100));
  return { amountCoveredByCnamgs, ticketModerateur };
}

export function computeReferenceFromLettreCle(
  coefficient: number,
  lettreCleNationalValue: number
): number {
  if (!(coefficient > 0) || !(lettreCleNationalValue > 0)) {
    throw new PricingError("Coefficient ou valeur de lettre-clé invalide.");
  }
  return Math.round(coefficient * lettreCleNationalValue);
}

export function formatFcfa(n: number): string {
  // Espace insécable fine pour les milliers, comme dans les documents officiels.
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F") + " FCFA";
}

// ─────────────────────────────────────────────────────────────────────
// Niveaux de tarification des consultations et prestations (Annexes 2 et 3)
// ─────────────────────────────────────────────────────────────────────
export type PricingTier =
  | "CHU_PUBLIC"
  | "HOPITAL_REGIONAL"
  | "CENTRE_SANTE"
  | "PRIVE_JOUR"
  | "PRIVE_NUIT";

export const TIER_LABELS: Record<PricingTier, string> = {
  CHU_PUBLIC: "Secteur public — centre hospitalier de référence",
  HOPITAL_REGIONAL: "Secteur public — hôpital régional",
  CENTRE_SANTE: "Secteur public — centre médical / centre de santé",
  PRIVE_JOUR: "Secteur privé — jours ouvrables",
  PRIVE_NUIT: "Secteur privé — nuits, dimanches et jours fériés",
};

export function isPrivateTier(tier: string | null | undefined): boolean {
  return tier === "PRIVE_JOUR" || tier === "PRIVE_NUIT";
}

export type PriceLine =
  | {
      ok: true;
      referenceAmount: number;
      billedAmount: number;
      coveredAmount: number;
      ticket: number;
      ratePercent: number;
    }
  | { ok: false; reason: string };

/**
 * Calcule une ligne de prix pour un statut donné.
 * `coveredStatuses` : si non vide, la prise en charge n'est prévue au barème que
 * pour ces statuts (ex. forfait accouchement → EXONERE uniquement).
 */
export function priceLine(params: {
  referenceAmount: number;
  billedAmount: number;
  status: CoverageType;
  rates: Record<CoverageType, number>;
  coveredStatuses?: string[];
}): PriceLine {
  const { referenceAmount, billedAmount, status, rates, coveredStatuses } = params;
  if (status !== "PAF" && coveredStatuses && coveredStatuses.length > 0 && !coveredStatuses.includes(status)) {
    return {
      ok: false,
      reason: "Prise en charge non prévue au barème pour ce statut — se renseigner auprès de la CNAMGS.",
    };
  }
  const ratePercent = rates[status];
  const { amountCoveredByCnamgs, ticketModerateur } = calculateTicketModerateur({
    referenceAmount,
    facilityBilledAmount: billedAmount,
    coverageRatePercent: ratePercent,
  });
  return {
    ok: true,
    referenceAmount,
    billedAmount,
    coveredAmount: amountCoveredByCnamgs,
    ticket: ticketModerateur,
    ratePercent,
  };
}
