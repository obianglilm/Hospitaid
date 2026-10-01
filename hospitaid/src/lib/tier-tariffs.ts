// Tarifs des consultations et "autres prestations" par niveau d'établissement.
// Source : Nomenclature des actes des professions de santé, Gabon, décembre 2010,
// Annexe 2 (secteur public) et Annexe 3 (secteur privé). Saisis tels quels depuis
// les tableaux du document — à reconfirmer avant mise en production, comme tout
// le reste des données de cette plateforme.
import type { PricingTier } from "./pricing-core";

export interface ConsultationDef {
  code: string; // identifiant interne stable, indépendant de la base
  label: string;
  synonyms: string[];
  category: "Consultations" | "Autres prestations";
}

export const CONSULTATIONS: ConsultationDef[] = [
  { code: "CONS_GENERALISTE", label: "Consultation — Médecin généraliste / psychologue clinicien", synonyms: ["médecin généraliste", "consultation généraliste", "voir un médecin"], category: "Consultations" },
  { code: "CONS_SPECIALISTE", label: "Consultation — Médecin spécialiste", synonyms: ["spécialiste", "consultation spécialiste"], category: "Consultations" },
  { code: "CONS_PSYCHIATRE", label: "Consultation — Psychiatre / neuropsychiatre", synonyms: ["psychiatre", "santé mentale"], category: "Consultations" },
  { code: "CONS_PROFESSEUR", label: "Consultation — Professeur de médecine", synonyms: ["professeur"], category: "Consultations" },
  { code: "CONS_DENTISTE", label: "Consultation — Chirurgien-dentiste", synonyms: ["dentiste", "consultation dentaire"], category: "Consultations" },
  { code: "CONS_SAGE_FEMME", label: "Consultation — Sage-femme", synonyms: ["sage-femme", "suivi de grossesse"], category: "Consultations" },
  { code: "CONS_INFIRMIER", label: "Consultation / visite — Infirmier d'État", synonyms: ["infirmier", "infirmière"], category: "Consultations" },
  { code: "CONS_DIETETICIEN", label: "Consultation — Diététicien", synonyms: ["diététicien", "nutrition"], category: "Consultations" },
  { code: "FORFAIT_ACCOUCHEMENT", label: "Forfait accouchement", synonyms: ["accouchement", "naissance", "maternité"], category: "Autres prestations" },
  { code: "JOURNEE_HOSPIT", label: "Journée d'hospitalisation (avec médicaments)", synonyms: ["hospitalisation", "séjour à l'hôpital"], category: "Autres prestations" },
  { code: "JOURNEE_REA", label: "Journée en réanimation", synonyms: ["réanimation"], category: "Autres prestations" },
  { code: "JOURNEE_SOINS_INTENSIFS", label: "Journée en soins intensifs", synonyms: ["soins intensifs"], category: "Autres prestations" },
];

interface TierRow {
  reference: number; // tarif conventionné
  billed: number; // tarif facturé par l'établissement
  coveredStatuses?: string[]; // si absent : tous statuts couverts au barème
}

// [tier][code] -> { reference, billed }
export const TIER_TARIFFS: Record<PricingTier, Record<string, TierRow>> = {
  CHU_PUBLIC: {
    CONS_GENERALISTE: { reference: 7500, billed: 7500 },
    CONS_SPECIALISTE: { reference: 10000, billed: 10000 },
    CONS_PSYCHIATRE: { reference: 12000, billed: 12000 },
    CONS_PROFESSEUR: { reference: 12000, billed: 12000 },
    CONS_DENTISTE: { reference: 7500, billed: 7500 },
    CONS_SAGE_FEMME: { reference: 4200, billed: 4200 },
    CONS_INFIRMIER: { reference: 3500, billed: 3500 },
    CONS_DIETETICIEN: { reference: 3500, billed: 3500 },
    FORFAIT_ACCOUCHEMENT: { reference: 60000, billed: 60000, coveredStatuses: ["EXONERE"] },
    JOURNEE_HOSPIT: { reference: 20000, billed: 20000 },
    JOURNEE_REA: { reference: 60000, billed: 60000 },
    JOURNEE_SOINS_INTENSIFS: { reference: 40000, billed: 40000 },
  },
  HOPITAL_REGIONAL: {
    CONS_GENERALISTE: { reference: 5000, billed: 5000 },
    CONS_SPECIALISTE: { reference: 8000, billed: 8000 },
    CONS_PSYCHIATRE: { reference: 10000, billed: 10000 },
    CONS_PROFESSEUR: { reference: 10000, billed: 10000 },
    CONS_DENTISTE: { reference: 5000, billed: 5000 },
    CONS_SAGE_FEMME: { reference: 3150, billed: 3150 },
    CONS_INFIRMIER: { reference: 2625, billed: 2625 },
    CONS_DIETETICIEN: { reference: 2625, billed: 2625 },
    FORFAIT_ACCOUCHEMENT: { reference: 60000, billed: 60000, coveredStatuses: ["EXONERE"] },
    JOURNEE_HOSPIT: { reference: 10000, billed: 10000 },
    JOURNEE_REA: { reference: 45000, billed: 45000 },
    JOURNEE_SOINS_INTENSIFS: { reference: 30000, billed: 30000 },
  },
  CENTRE_SANTE: {
    CONS_GENERALISTE: { reference: 3000, billed: 3000 },
    CONS_SPECIALISTE: { reference: 4800, billed: 4800 },
    CONS_PSYCHIATRE: { reference: 5000, billed: 5000 },
    CONS_PROFESSEUR: { reference: 5000, billed: 5000 },
    CONS_DENTISTE: { reference: 3000, billed: 3000 },
    CONS_SAGE_FEMME: { reference: 2520, billed: 2520 },
    CONS_INFIRMIER: { reference: 2100, billed: 2100 },
    CONS_DIETETICIEN: { reference: 2100, billed: 2100 },
    FORFAIT_ACCOUCHEMENT: { reference: 20000, billed: 20000, coveredStatuses: ["EXONERE"] },
    JOURNEE_HOSPIT: { reference: 5000, billed: 5000 },
    // Pas de tarif réanimation / soins intensifs pour ce niveau dans l'Annexe 2.
  },
  PRIVE_JOUR: {
    CONS_GENERALISTE: { reference: 7500, billed: 15000 },
    CONS_SPECIALISTE: { reference: 10000, billed: 20000 },
    CONS_PSYCHIATRE: { reference: 12000, billed: 25000 },
    CONS_PROFESSEUR: { reference: 12000, billed: 25000 },
    CONS_DENTISTE: { reference: 7500, billed: 11000 },
    CONS_SAGE_FEMME: { reference: 4200, billed: 6500 },
    CONS_INFIRMIER: { reference: 3500, billed: 4250 },
    CONS_DIETETICIEN: { reference: 3500, billed: 4250 },
    FORFAIT_ACCOUCHEMENT: { reference: 60000, billed: 60000, coveredStatuses: ["EXONERE"] },
    JOURNEE_HOSPIT: { reference: 20000, billed: 20000 },
    JOURNEE_REA: { reference: 60000, billed: 60000 },
    JOURNEE_SOINS_INTENSIFS: { reference: 40000, billed: 40000 },
  },
  PRIVE_NUIT: {
    CONS_GENERALISTE: { reference: 7500, billed: 16500 },
    CONS_SPECIALISTE: { reference: 10000, billed: 22000 },
    CONS_PSYCHIATRE: { reference: 12000, billed: 27500 },
    CONS_PROFESSEUR: { reference: 12000, billed: 27500 },
    CONS_DENTISTE: { reference: 7500, billed: 11100 },
    CONS_SAGE_FEMME: { reference: 4200, billed: 7150 },
    CONS_INFIRMIER: { reference: 3500, billed: 4675 },
    CONS_DIETETICIEN: { reference: 3500, billed: 4675 },
    FORFAIT_ACCOUCHEMENT: { reference: 60000, billed: 60000, coveredStatuses: ["EXONERE"] },
    JOURNEE_HOSPIT: { reference: 20000, billed: 20000 },
    JOURNEE_REA: { reference: 60000, billed: 60000 },
    JOURNEE_SOINS_INTENSIFS: { reference: 40000, billed: 40000 },
  },
};

export function getConsultationTariff(tier: PricingTier, code: string): TierRow | undefined {
  return TIER_TARIFFS[tier][code];
}
