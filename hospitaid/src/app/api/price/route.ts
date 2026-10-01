import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  computeReferenceFromLettreCle,
  priceLine,
  DEFAULT_COVERAGE_RATES,
  type CoverageType,
} from "@/lib/pricing-core";
import { CONSULTATIONS, getConsultationTariff } from "@/lib/tier-tariffs";
import type { PricingTier } from "@/lib/pricing-core";

interface RequestItem {
  kind: "exam" | "consultation";
  id?: string; // pour kind === "exam"
  code?: string; // pour kind === "consultation"
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: RequestItem[] = body?.items ?? [];
  const facilityId: string | undefined = body?.facilityId;
  const status: CoverageType | undefined = body?.status;

  if (!facilityId || !status || items.length === 0) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  const facility = await prisma.healthFacility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    return NextResponse.json({ error: "Établissement introuvable." }, { status: 404 });
  }

  // Les taux par défaut viennent de la base (règles CNAMGS), avec repli sur les
  // constantes officielles si la table est vide pour une raison quelconque.
  const rules = await prisma.coverageRule.findMany({ where: { isDefault: true } });
  const rates = { ...DEFAULT_COVERAGE_RATES };
  for (const r of rules) {
    if (r.coverageType in rates) rates[r.coverageType as CoverageType] = r.coverageRatePercent;
  }

  const lines: Array<{
    label: string;
    ok: boolean;
    reason?: string;
    referenceAmount?: number;
    billedAmount?: number;
    coveredAmount?: number;
    ticket?: number;
  }> = [];

  for (const item of items) {
    if (item.kind === "consultation") {
      const def = CONSULTATIONS.find((c) => c.code === item.code);
      if (!def) {
        lines.push({ label: item.code ?? "?", ok: false, reason: "Prestation inconnue." });
        continue;
      }
      if (!facility.tier) {
        lines.push({
          label: def.label,
          ok: false,
          reason: "Niveau tarifaire de l'établissement non renseigné — impossible de calculer ce tarif.",
        });
        continue;
      }
      const row = getConsultationTariff(facility.tier as PricingTier, def.code);
      if (!row) {
        lines.push({
          label: def.label,
          ok: false,
          reason: "Cette prestation n'est pas répertoriée pour ce niveau d'établissement.",
        });
        continue;
      }
      const result = priceLine({
        referenceAmount: row.reference,
        billedAmount: row.billed,
        status,
        rates,
        coveredStatuses: row.coveredStatuses,
      });
      lines.push(
        result.ok
          ? { label: def.label, ok: true, referenceAmount: result.referenceAmount, billedAmount: result.billedAmount, coveredAmount: result.coveredAmount, ticket: result.ticket }
          : { label: def.label, ok: false, reason: result.reason }
      );
    } else if (item.kind === "exam" && item.id) {
      const exam = await prisma.exam.findUnique({
        where: { id: item.id },
        include: { lettreCle: true },
      });
      if (!exam) {
        lines.push({ label: "Acte introuvable", ok: false, reason: "Acte introuvable." });
        continue;
      }
      if (!exam.lettreCle || !exam.coefficient || !exam.lettreCle.nationalValue) {
        lines.push({
          label: exam.officialName,
          ok: false,
          reason: "Valeur de cotation non disponible pour cet acte (lettre-clé sans valeur confirmée).",
        });
        continue;
      }
      const reference = computeReferenceFromLettreCle(exam.coefficient, exam.lettreCle.nationalValue);
      const result = priceLine({ referenceAmount: reference, billedAmount: reference, status, rates });
      lines.push(
        result.ok
          ? { label: exam.officialName, ok: true, referenceAmount: result.referenceAmount, billedAmount: result.billedAmount, coveredAmount: result.coveredAmount, ticket: result.ticket }
          : { label: exam.officialName, ok: false, reason: result.reason }
      );
    }
  }

  const total = lines.reduce((s, l) => s + (l.ticket ?? 0), 0);
  const totalBilled = lines.reduce((s, l) => s + (l.billedAmount ?? 0), 0);
  const totalCovered = lines.reduce((s, l) => s + (l.coveredAmount ?? 0), 0);

  return NextResponse.json({ lines, total, totalBilled, totalCovered, facility: { name: facility.name, tier: facility.tier } });
}
