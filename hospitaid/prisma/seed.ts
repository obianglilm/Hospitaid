import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Source : "Nomenclature des actes des professions de santé", Ministère
// de la Santé du Gabon, Décembre 2010 — Annexe 1 : Glossaire et valeurs
// des lettres-clés. Fichier importé : Tarification_CNAMGS (PDF fourni
// par le porteur de projet le 23/09/2026).
const SOURCE = "Nomenclature CNAMGS - Annexe 1 (Décembre 2010)";

const LETTRES_CLES = [
  { code: "K", label: "Actes de chirurgie et de spécialité pratiqués par le médecin", nationalValue: 1200 },
  { code: "KC", label: "Actes de chirurgie et de spécialité pratiqués par le médecin spécialiste", nationalValue: 1300 },
  { code: "KE", label: "Actes d'échographie, de doppler pratiqués par le médecin spécialiste", nationalValue: 1200 },
  { code: "P", label: "Actes d'anatomie et de cytologie pathologiques", nationalValue: 150 },
  { code: "Z", label: "Actes de radiologie ionisante pratiqués par le spécialiste ou le chirurgien", nationalValue: 1000 },
  { code: "ZN", label: "Actes de radiologie non ionisante / nucléaire", nationalValue: 1100 },
  { code: "PRO", label: "Actes de prothèses", nationalValue: 800 },
  { code: "SF", label: "Actes pratiqués par la sage-femme", nationalValue: 900 },
  { code: "SFI", label: "Actes infirmiers pratiqués par la sage-femme", nationalValue: 700 },
  { code: "AIS", label: "Actes pratiqués par l'infirmier (diagnostic infirmier)", nationalValue: 600 },
  { code: "AMI", label: "Actes prescrits par le médecin et pratiqués par l'infirmier", nationalValue: 900 },
  { code: "AMK", label: "Actes pratiqués par le masseur-kinésithérapeute", nationalValue: 900 },
  { code: "AMP", label: "Actes pratiqués par la puéricultrice", nationalValue: 900 },
  { code: "AMO", label: "Actes pratiqués par l'orthophoniste", nationalValue: 900 },
  { code: "AMY", label: "Actes pratiqués par l'orthoptiste", nationalValue: 900 },
  { code: "AMS", label: "Actes pratiqués par le masseur", nationalValue: 900 },
  { code: "D", label: "Actes dentaires autres que d'orthopédie dentaire", nationalValue: 1100 },
  { code: "B", label: "Actes pratiqués par le biologiste au laboratoire", nationalValue: 125 },
] as const;

// Taux de prise en charge CNAMGS par statut (Annexe 1 pour les 3 premiers ;
// PAF confirmé par le porteur de projet = "Particulier À ses Frais",
// personne non assurée, 0% de prise en charge CNAMGS).
const COVERAGE_DEFAULTS = [
  { coverageType: "EXONERE" as const, coverageRatePercent: 100 },
  { coverageType: "PLEIN" as const, coverageRatePercent: 80 },
  { coverageType: "PLEIN_ALD" as const, coverageRatePercent: 90 },
  { coverageType: "PAF" as const, coverageRatePercent: 0 }, // Particulier À ses Frais (non assuré)
];

async function main() {
  console.log("Seed : lettres-clés (Annexe 1)...");
  for (const lc of LETTRES_CLES) {
    await prisma.lettreCle.upsert({
      where: { code: lc.code },
      update: { label: lc.label, nationalValue: lc.nationalValue, source: SOURCE },
      create: { ...lc, source: SOURCE },
    });
  }

  console.log("Seed : règles de couverture par défaut...");
  for (const rule of COVERAGE_DEFAULTS) {
    const existing = await prisma.coverageRule.findFirst({
      where: { coverageType: rule.coverageType, isDefault: true },
    });
    if (!existing) {
      await prisma.coverageRule.create({
        data: {
          coverageType: rule.coverageType,
          coverageRatePercent: rule.coverageRatePercent,
          isDefault: true,
          source:
            rule.coverageType === "PAF"
              ? "Confirmé par le porteur de projet (Particulier À ses Frais, non assuré)"
              : SOURCE,
        },
      });
    }
  }

  console.log("Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
