import { NextRequest, NextResponse } from "next/server";
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
import { getCurrentUserId } from "@/lib/current-user";

const MAX_ITEMS = 30;
const VALID_STATUSES = Object.keys(DEFAULT_COVERAGE_RATES);

interface RequestItem {
  kind: "exam" | "consultation";
  id?: string; // pour kind === "exam"
  code?: string; // pour kind === "consultation"
}

interface ResultLine {
  label: string;
  ok: boolean;
  reason?: string;
  referenceAmount?: number;
  billedAmount?: number;
  coveredAmount?: number;
  ticket?: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawItems: unknown = body?.items;
  const facilityId: unknown = body?.facilityId;
  const statusRaw: unknown = body?.status;

  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0 ||
    rawItems.length > MAX_ITEMS ||
    typeof facilityId !== "string" ||
    typeof statusRaw !== "string" ||
    !VALID_STATUSES.includes(statusRaw)
  ) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }
  const status = statusRaw as CoverageType;
  const items: RequestItem[] = rawItems
    .filter((i): i is RequestItem => typeof i === "object" && i !== null && (i.kind === "exam" || i.kind === "consultation"))
    .map((i) => ({ kind: i.kind, id: typeof i.id === "string" ? i.id : undefined, code: typeof i.code === "string" ? i.code : undefined }));
  if (items.length === 0) {
    return NextResponse.json({ error: "Aucune prestation valide." }, { status: 400 });
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

  const consultations = await getEffectiveConsultations();
  const lines: ResultLine[] = [];

  for (const item of items) {
    if (item.kind === "consultation") {
      const def = consultations.find((c) => c.code === item.code);
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
    } else if (item.id) {
      const exam = await prisma.exam.findUnique({
        where: { id: item.id },
        include: { lettreCle: true },
      });
      if (!exam) {
        lines.push({ label: "Acte introuvable", ok: false, reason: "Acte introuvable." });
        continue;
      }
      const label = exam.displayName ?? exam.officialName;
      if (!exam.lettreCle || !exam.coefficient || !exam.lettreCle.nationalValue) {
        lines.push({
          label,
          ok: false,
          reason: "Valeur de cotation non disponible pour cet acte (lettre-clé sans valeur confirmée).",
        });
        continue;
      }
      const reference = computeReferenceFromLettreCle(exam.coefficient, exam.lettreCle.nationalValue);
      const result = priceLine({ referenceAmount: reference, billedAmount: reference, status, rates });
      lines.push(
        result.ok
          ? { label, ok: true, referenceAmount: result.referenceAmount, billedAmount: result.billedAmount, coveredAmount: result.coveredAmount, ticket: result.ticket }
          : { label, ok: false, reason: result.reason }
      );
    }
  }

  const total = lines.reduce((s, l) => s + (l.ticket ?? 0), 0);
  const totalBilled = lines.reduce((s, l) => s + (l.billedAmount ?? 0), 0);
  const totalCovered = lines.reduce((s, l) => s + (l.coveredAmount ?? 0), 0);

  // Historique : uniquement pour un utilisateur connecté, jamais bloquant pour le calcul.
  let saved = false;
  try {
    const userId = await getCurrentUserId();
    if (userId && lines.some((l) => l.ok)) {
      await prisma.simulationRecord.create({
        data: {
          userId,
          facilityName: facility.name,
          coverageType: status,
          total,
          lines: lines.map((l) => ({ label: l.label, ok: l.ok, ticket: l.ticket ?? null })),
        },
      });
      saved = true;
    }
  } catch {
    saved = false;
  }

  return NextResponse.json({
    lines,
    total,
    totalBilled,
    totalCovered,
    saved,
    facility: { name: facility.name, tier: facility.tier },
  });
}
