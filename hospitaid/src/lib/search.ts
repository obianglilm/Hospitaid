import { prisma } from "@/lib/prisma";
import { getEffectiveConsultations } from "@/lib/consultation-names";
import { normalizeText, relevanceScore, searchTokens } from "@/lib/names-core";

export type SearchResult =
  | { kind: "exam"; id: string; label: string; category: string; meta: string }
  | { kind: "consultation"; code: string; label: string; category: string; meta: string };

export async function searchCatalog(query: string): Promise<SearchResult[]> {
  const tokens = searchTokens(query);
  if (normalizeText(query).length < 2 || tokens.length === 0) return [];

  // Consultations / prestations forfaitaires (12, noms modifiables par l'admin).
  const consultations = await getEffectiveConsultations();
  const consultationHits = consultations
    .filter((c) => {
      const hay = normalizeText([c.label, ...c.synonyms].join(" "));
      return tokens.every((t) => hay.includes(t));
    })
    .map((c) => ({
      score: relevanceScore({ label: c.label, synonyms: c.synonyms }, query),
      result: {
        kind: "consultation" as const,
        code: c.code,
        label: c.label,
        category: c.category,
        meta: "Tarif selon l'établissement",
      },
    }));

  // Actes de la nomenclature : tous les mots saisis doivent être présents (accents et
  // majuscules ignorés) dans le nom officiel, le nom usuel, les synonymes ou le code.
  const exams = await prisma.exam.findMany({
    where: { AND: tokens.map((t) => ({ searchText: { contains: t } })) },
    take: 80,
    select: {
      id: true,
      officialName: true,
      displayName: true,
      synonyms: true,
      actType: true,
      lettreCleCode: true,
      coefficient: true,
    },
  });

  const examHits = exams.map((e) => {
    const label = e.displayName ?? e.officialName;
    return {
      score: relevanceScore({ label, synonyms: [e.officialName, ...e.synonyms] }, query),
      result: {
        kind: "exam" as const,
        id: e.id,
        label,
        category: e.actType ? `Acte technique (${e.actType})` : "Acte technique",
        meta: e.displayName ? `Libellé officiel : ${e.officialName}` : e.lettreCleCode && e.coefficient ? `${e.lettreCleCode} × ${e.coefficient}` : "",
      },
    };
  });

  return [...consultationHits, ...examHits]
    .sort((a, b) => a.score - b.score || a.result.label.length - b.result.label.length)
    .slice(0, 40)
    .map((x) => x.result);
}
