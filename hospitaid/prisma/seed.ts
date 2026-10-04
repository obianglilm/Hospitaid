import { PrismaClient } from "@prisma/client";
import nomenclatureActes from "./data/nomenclature-actes.json";
import { buildSearchText } from "../src/lib/names-core";

const prisma = new PrismaClient();

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
  { code: "Rd", label: "Actes de radiodiagnostic (valeur non listée en Annexe 1)", nationalValue: 0 },
  { code: "Rt", label: "Actes de radiothérapie (valeur non listée en Annexe 1)", nationalValue: 0 },
] as const;

const COVERAGE_DEFAULTS = [
  { coverageType: "EXONERE" as const, coverageRatePercent: 100 },
  { coverageType: "PLEIN" as const, coverageRatePercent: 80 },
  { coverageType: "PLEIN_ALD" as const, coverageRatePercent: 90 },
  { coverageType: "PAF" as const, coverageRatePercent: 0 },
];

const FACILITY_TYPES = [
  { code: "PUBLIC", label: "Établissement public" },
  { code: "PRIVATE", label: "Établissement privé" },
  { code: "LAB", label: "Laboratoire" },
  { code: "IMAGING", label: "Centre d'imagerie" },
  { code: "OTHER", label: "Autre" },
];

const FACILITIES = [
  {
    name: "CHUL — Centre Hospitalier Universitaire de Libreville",
    shortName: "CHUL",
    typeCode: "PUBLIC",
    tier: "CHU_PUBLIC" as const,
    city: "Libreville",
    address: "356 Rue Ndende, Libreville",
    phone: "À vérifier — plusieurs numéros trouvés en ligne, non confirmés",
    sourceNote: "Wikipédia FR (adresse et coordonnées 0°23'32\"N 9°26'54\"E), Infos Gabon (déc. 2025), GabonReview (juin 2026) — 29/09/2026",
  },
  {
    name: "CHUO — Centre Hospitalier Universitaire d'Owendo",
    shortName: "CHUO",
    typeCode: "PUBLIC",
    tier: "CHU_PUBLIC" as const,
    city: "Owendo",
    address: "BP 50, Owendo, Libreville",
    phone: "062 52 03 82 (à reconfirmer)",
    sourceNote: "Avis d'appel d'offres CHUO publiés dans L'Union (2023) — 27/09/2026",
  },
  {
    name: "CHU Mère-Enfant Fondation Jeanne Ebori (CHUMEFJE)",
    shortName: "Jeanne Ebori",
    typeCode: "PUBLIC",
    tier: "CHU_PUBLIC" as const,
    city: "Libreville",
    address: "À vérifier (secteur centre-ville, à proximité du quartier Louis)",
    phone: "À vérifier",
    sourceNote:
      "Nom officiel confirmé par L'Union (2021) et GabonReview (juin 2026, audition Assemblée nationale) — " +
      "environ 6 000 accouchements/an. Adresse précise non trouvée — 29/09/2026",
  },
  {
    name: "Laboratoire National de Santé Publique",
    shortName: "LNSP",
    typeCode: "LAB",
    tier: null,
    city: "Libreville",
    address: "À proximité du CHUL, Libreville (adresse précise à vérifier)",
    phone: "À vérifier",
    sourceNote:
      "ASLM Lab Mapping, AllAfrica, L'Union (rénové en 2026) ; statut juridique en cours de formalisation " +
      "par le Ministère de la Santé (GabonReview, juin 2026) — 29/09/2026",
  },
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
    if (existing) {
      await prisma.coverageRule.update({
        where: { id: existing.id },
        data: { coverageRatePercent: rule.coverageRatePercent },
      });
    } else {
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

  console.log("Seed : types d'établissements...");
  for (const t of FACILITY_TYPES) {
    await prisma.facilityType.upsert({ where: { code: t.code }, update: { label: t.label }, create: t });
  }

  console.log("Seed : établissements (statut non vérifié)...");
  for (const f of FACILITIES) {
    const type = await prisma.facilityType.findUnique({ where: { code: f.typeCode } });
    if (!type) continue;
    // Identifié par shortName (stable) — le nom complet peut être corrigé
    // au fil des vérifications (ex. nom officiel CHUMEFJE trouvé après coup)
    // sans que ça crée un doublon.
    const existing = await prisma.healthFacility.findFirst({ where: { shortName: f.shortName } });
    if (existing) {
      // On ne touche jamais verifiedAt ici : si un admin a déjà validé cet
      // établissement, un simple re-seed ne doit pas annuler cette validation.
      await prisma.healthFacility.update({
        where: { id: existing.id },
        data: {
          name: f.name,
          typeId: type.id,
          tier: f.tier,
          city: f.city,
          address: f.address,
          phone: f.phone,
          sourceNote: f.sourceNote,
        },
      });
    } else {
      await prisma.healthFacility.create({
        data: {
          name: f.name,
          shortName: f.shortName,
          typeId: type.id,
          tier: f.tier,
          city: f.city,
          address: f.address,
          phone: f.phone,
          status: "ACTIVE",
          verifiedAt: null,
          sourceNote: f.sourceNote,
        },
      });
    }
  }

  console.log("Seed : import de la nomenclature (actes extraits du PDF officiel)...");
  const NOMENCLATURE_VERSION = "2010-auto-extract-v2";
  const existingCount = await prisma.nomenclatureCode.count({ where: { version: NOMENCLATURE_VERSION } });
  if (existingCount >= nomenclatureActes.length) {
    console.log(`  déjà importé (${existingCount} codes) — ignoré.`);
  } else {
    type ActeRow = { chapter: string; code: string; label: string; letterCode: string; coefficient: number; synonyms: string[] };
    const actes = nomenclatureActes as ActeRow[];

    await prisma.nomenclatureCode.createMany({
      data: actes.map((a) => ({
        code: a.code,
        label: a.label,
        version: NOMENCLATURE_VERSION,
        effectiveFrom: new Date("2010-12-01"),
        source:
          "Extraction automatique — Nomenclature des actes des professions de santé, Gabon, décembre 2010 " +
          "(fournie par le porteur de projet le 23/09/2026). Statut à vérifier ligne par ligne avant publication.",
      })),
      skipDuplicates: true,
    });

    const codes = await prisma.nomenclatureCode.findMany({
      where: { version: NOMENCLATURE_VERSION },
      select: { id: true, code: true },
    });
    const idByCode = new Map(codes.map((c) => [c.code, c.id]));

    const BATCH = 300;
    for (let i = 0; i < actes.length; i += BATCH) {
      const slice = actes.slice(i, i + BATCH);
      await prisma.exam.createMany({
        data: slice.map((a) => ({
          officialName: a.label,
          nomenclatureCodeId: idByCode.get(a.code) ?? null,
          actType: a.chapter,
          isConsultation: false,
          lettreCleCode: a.letterCode,
          coefficient: a.coefficient,
          synonyms: a.synonyms ?? [],
          searchText: buildSearchText({ officialName: a.label, synonyms: a.synonyms ?? [], code: a.code }),
          status: "A_VERIFIER" as const,
          nomenclatureVersion: NOMENCLATURE_VERSION,
        })),
      });
      console.log(`  ... ${Math.min(i + BATCH, actes.length)}/${actes.length}`);
    }
    console.log(`  ${actes.length} actes importés (statut: à vérifier).`);
  }

  console.log("Seed : synchronisation des synonymes (sans écraser les modifications faites par un admin)...");
  {
    type ActeRow = { chapter: string; code: string; label: string; letterCode: string; coefficient: number; synonyms: string[] };
    const actesWithSynonyms = (nomenclatureActes as ActeRow[]).filter((a) => a.synonyms?.length > 0);
    let updated = 0;
    for (const a of actesWithSynonyms) {
      const nc = await prisma.nomenclatureCode.findFirst({ where: { code: a.code }, select: { id: true } });
      if (!nc) continue;
      const exam = await prisma.exam.findFirst({
        where: { nomenclatureCodeId: nc.id },
        select: { id: true, officialName: true, displayName: true, synonyms: true, namesEditedAt: true },
      });
      if (!exam || exam.namesEditedAt) continue; // édité à la main : on n'y touche plus
      const same =
        exam.synonyms.length === a.synonyms.length && exam.synonyms.every((syn, i) => syn === a.synonyms[i]);
      if (!same) {
        await prisma.exam.update({
          where: { id: exam.id },
          data: {
            synonyms: a.synonyms,
            searchText: buildSearchText({
              officialName: exam.officialName,
              displayName: exam.displayName,
              synonyms: a.synonyms,
              code: a.code,
            }),
          },
        });
        updated++;
      }
    }
    console.log(`  ${updated} actes mis à jour (sur ${actesWithSynonyms.length} concernés).`);
  }

  console.log("Seed : index de recherche (rattrapage des actes sans texte de recherche)...");
  {
    const pending = await prisma.exam.findMany({
      where: { searchText: "" },
      select: {
        id: true,
        officialName: true,
        displayName: true,
        synonyms: true,
        nomenclatureCode: { select: { code: true } },
      },
    });
    const BATCH = 100;
    for (let i = 0; i < pending.length; i += BATCH) {
      const slice = pending.slice(i, i + BATCH);
      await prisma.$transaction(
        slice.map((e) =>
          prisma.exam.update({
            where: { id: e.id },
            data: {
              searchText: buildSearchText({
                officialName: e.officialName,
                displayName: e.displayName,
                synonyms: e.synonyms,
                code: e.nomenclatureCode?.code ?? null,
              }),
            },
          })
        )
      );
    }
    console.log(`  ${pending.length} actes indexés.`);
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
