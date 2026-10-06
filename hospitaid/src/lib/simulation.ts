// Calcul d'une simulation : source unique pour l'écran, l'historique et le PDF.
import { prisma } from "@/lib/prisma";
import {
  computeReferenceFromLettreCle,
  priceLine,
  DEFAULT_COVERAGE_RATES,
  type CoverageType,
  type PricingTier,
} from "@/lib/pricing-core";
import { getConsultationTariff } from "@/lib/tier-tariffs";
import { getEffectiveConsultations } from "@/lib/consultation-names";
import { getCoverageExclusions } from "@/lib/settings";
import { isConsultationExcluded, isExamExcluded } from "@/lib/exclusions-core";
import { pickOverride, resolveAmounts, type OverrideRow } from "@/lib/price-core";
import type { SimulationInput } from "@/lib/simulation-core";

export interface SimLine {
  label: string;
  ok: boolean;
  reason?: string;
  notCovered?: boolean;
  adjusted?: boolean;
  referenceAmount?: number;
  billedAmount?: number;
  coveredAmount?: number;
  ticket?: number;
}

export interface SimulationData {
  lines: SimLine[];
  total: number;
  totalBilled: number;
  totalCovered: number;
  ratePercent: number;
  facility: {
    id: string;
    name: string;
    tier: string | null;
    typeLabel: string;
    city: string;
    address: string | null;
    phone: string | null;
    verified: boolean;
    marginPercent: number;
  };
}

export type SimulationOutcome = { ok: true; data: SimulationData } | { ok: false; status: number; error: string };

export async function runSimulation(input: SimulationInput): Promise<SimulationOutcome> {
  const { items, facilityId, status } = input;

  const facility = await prisma.healthFacility.findUnique({ where: { id: facilityId }, include: { type: true } });
  if (!facility) return { ok: false, status: 404, error: "Établissement introuvable." };

  // Taux de prise en charge : base de données, avec repli sur les constantes officielles.
  const rules = await prisma.coverageRule.findMany({ where: { isDefault: true } });
  const rates: Record<CoverageType, number> = { ...DEFAULT_COVERAGE_RATES };
  for (const r of rules) {
    if (r.coverageType in rates) rates[r.coverageType as CoverageType] = r.coverageRatePercent;
  }

  const [consultations, exclusions, overrideRows] = await Promise.all([
    getEffectiveConsultations(),
    getCoverageExclusions(),
    prisma.priceOverride.findMany({ where: { scope: { in: ["ALL", facility.id] } } }),
  ]);
  const overrides: OverrideRow[] = overrideRows.map((o) => ({
    scope: o.scope,
    kind: o.kind,
    targetKey: o.targetKey,
    referenceAmount: o.referenceAmount,
    billedAmount: o.billedAmount,
  }));

  const examIds = items.flatMap((i) => (i.kind === "exam" && i.id ? [i.id] : []));
  const exams = examIds.length > 0 ? await prisma.exam.findMany({ where: { id: { in: examIds } }, include: { lettreCle: true } }) : [];

  const lines: SimLine[] = [];
  for (const item of items) {
    if (item.kind === "consultation") {
      const def = consultations.find((c) => c.code === item.code);
      if (!def) {
        lines.push({ label: item.code ?? "?", ok: false, reason: "Prestation inconnue." });
        continue;
      }
      const row = facility.tier ? getConsultationTariff(facility.tier as PricingTier, def.code) : undefined;
      const amounts = resolveAmounts({
        reference: row?.reference ?? null,
        baseBilled: row?.billed ?? null,
        marginPercent: facility.marginPercent,
        override: pickOverride(overrides, facility.id, "CONSULTATION", def.code),
      });
      if (!amounts) {
        lines.push({
          label: def.label,
          ok: false,
          reason: facility.tier
            ? "Cette prestation n'est pas répertoriée pour ce niveau d'établissement."
            : "Niveau tarifaire de l'établissement non renseigné — impossible de calculer ce tarif.",
        });
        continue;
      }
      const notCovered = isConsultationExcluded(exclusions, def.code);
      const result = priceLine({
        referenceAmount: amounts.reference,
        billedAmount: amounts.billed,
        status,
        rates,
        coveredStatuses: row?.coveredStatuses,
        notCovered,
      });
      lines.push(
        result.ok
          ? { label: def.label, ok: true, notCovered, adjusted: amounts.adjusted, referenceAmount: result.referenceAmount, billedAmount: result.billedAmount, coveredAmount: result.coveredAmount, ticket: result.ticket }
          : { label: def.label, ok: false, reason: result.reason }
      );
    } else {
      const exam = exams.find((e) => e.id === item.id);
      if (!exam) {
        lines.push({ label: "Acte introuvable", ok: false, reason: "Acte introuvable." });
        continue;
      }
      const label = exam.displayName ?? exam.officialName;
      const computed =
        exam.lettreCle?.nationalValue && exam.coefficient
          ? computeReferenceFromLettreCle(exam.coefficient, exam.lettreCle.nationalValue)
          : null;
      const amounts = resolveAmounts({
        reference: computed,
        baseBilled: null,
        marginPercent: facility.marginPercent,
        override: pickOverride(overrides, facility.id, "EXAM", exam.id),
      });
      if (!amounts) {
        lines.push({ label, ok: false, reason: "Tarif non disponible pour cet acte (valeur de cotation non confirmée)." });
        continue;
      }
      const notCovered = isExamExcluded(exclusions, exam.lettreCleCode);
      const result = priceLine({ referenceAmount: amounts.reference, billedAmount: amounts.billed, status, rates, notCovered });
      lines.push(
        result.ok
          ? { label, ok: true, notCovered, adjusted: amounts.adjusted, referenceAmount: result.referenceAmount, billedAmount: result.billedAmount, coveredAmount: result.coveredAmount, ticket: result.ticket }
          : { label, ok: false, reason: result.reason }
      );
    }
  }

  return {
    ok: true,
    data: {
      lines,
      total: lines.reduce((s, l) => s + (l.ticket ?? 0), 0),
      totalBilled: lines.reduce((s, l) => s + (l.billedAmount ?? 0), 0),
      totalCovered: lines.reduce((s, l) => s + (l.coveredAmount ?? 0), 0),
      ratePercent: rates[status],
      facility: {
        id: facility.id,
        name: facility.name,
        tier: facility.tier,
        typeLabel: facility.type.label,
        city: facility.city,
        address: facility.address,
        phone: facility.phone,
        verified: facility.verifiedAt !== null,
        marginPercent: facility.marginPercent,
      },
    },
  };
}
