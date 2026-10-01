import { prisma } from "@/lib/prisma";
import { CONSULTATIONS, type ConsultationDef } from "@/lib/tier-tariffs";

export type SearchResult =
  | { kind: "exam"; id: string; label: string; category: string; meta: string }
  | { kind: "consultation"; code: string; label: string; category: string; meta: string };

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function searchCatalog(query: string): Promise<SearchResult[]> {
  const q = norm(query.trim());
  if (q.length < 2) return [];

  const consultationHits: SearchResult[] = CONSULTATIONS.filter(
    (c: ConsultationDef) =>
      norm(c.label).includes(q) || c.synonyms.some((s) => norm(s).includes(q))
  ).map((c) => ({
    kind: "consultation" as const,
    code: c.code,
    label: c.label,
    category: c.category,
    meta: "Consultation — tarif selon l'établissement",
  }));

  // Recherche PostgreSQL : libellé OU un synonyme contient le terme (insensible à la casse/accents
  // gérée côté application ci-dessus n'est pas possible en SQL simple ; on fait une recherche large
  // en SQL puis on affine si besoin — suffisant pour la V1).
  const examHits = await prisma.exam.findMany({
    where: {
      OR: [
        { officialName: { contains: query, mode: "insensitive" } },
        { synonyms: { has: query.toLowerCase() } },
        { synonyms: { hasSome: query.toLowerCase().split(/\s+/) } },
      ],
    },
    take: 40,
    orderBy: { officialName: "asc" },
  });

  const examResults: SearchResult[] = examHits.map((e) => ({
    kind: "exam" as const,
    id: e.id,
    label: e.officialName,
    category: e.actType ? `Acte technique (${e.actType})` : "Acte technique",
    meta: e.lettreCleCode && e.coefficient ? `${e.lettreCleCode} × ${e.coefficient}` : "",
  }));

  return [...consultationHits, ...examResults].slice(0, 40);
}
