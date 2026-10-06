import { NextRequest, NextResponse } from "next/server";
import { parseSimulationInput } from "@/lib/simulation-core";
import { runSimulation } from "@/lib/simulation";
import { getCurrentUser } from "@/lib/current-user";
import { getSiteInfo } from "@/lib/settings";
import { contactLines } from "@/lib/site-info-core";
import { COVERAGE_LABELS } from "@/lib/pricing-core";
import { buildSimulationPdf } from "@/lib/pdf-report";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const input = parseSimulationInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  const outcome = await runSimulation(input);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  const { data } = outcome;
  if (!data.lines.some((l) => l.ok)) {
    return NextResponse.json({ error: "Aucune prestation calculée : rien à imprimer." }, { status: 422 });
  }

  const [user, site] = await Promise.all([getCurrentUser().catch(() => null), getSiteInfo().catch(() => null)]);
  const now = new Date();

  const bytes = buildSimulationPdf({
    generatedAt: now,
    site: {
      name: "HospitAid",
      tagline: "Parce que chaque patient compte.",
      website: site?.website ?? "hospitaid.vercel.app",
      contactLines: site ? contactLines(site) : [],
    },
    patient: {
      name: input.patientName ?? user?.fullName ?? null,
      username: user?.username ?? user?.email ?? null,
      coverageLabel: COVERAGE_LABELS[input.status].label,
      coverageRate: data.ratePercent,
    },
    facility: {
      name: data.facility.name,
      typeLabel: data.facility.typeLabel,
      city: data.facility.city,
      address: data.facility.address,
      phone: data.facility.phone,
      verified: data.facility.verified,
    },
    lines: data.lines.map((l) => ({
      label: l.label,
      ok: l.ok,
      reason: l.reason,
      notCovered: l.notCovered,
      billed: l.billedAmount,
      covered: l.coveredAmount,
      ticket: l.ticket,
    })),
    totals: { billed: data.totalBilled, covered: data.totalCovered, ticket: data.total },
    extraNotes: data.lines.some((l) => l.ok && l.notCovered)
      ? ["Les prestations signalées « Non pris en charge par la CNAMGS » restent entièrement à la charge du patient."]
      : [],
  });

  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Libreville" }).format(now); // AAAA-MM-JJ
  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="HospitAid-simulation-${day}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
