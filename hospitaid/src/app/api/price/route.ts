import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSimulationInput } from "@/lib/simulation-core";
import { runSimulation } from "@/lib/simulation";
import { getCurrentUserId } from "@/lib/current-user";

export async function POST(req: NextRequest) {
  const input = parseSimulationInput(await req.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  const outcome = await runSimulation(input);
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  const { lines, total, totalBilled, totalCovered, facility } = outcome.data;

  // Historique : uniquement pour un utilisateur connecté, jamais bloquant pour le calcul.
  let saved = false;
  try {
    const userId = await getCurrentUserId();
    if (userId && lines.some((l) => l.ok)) {
      await prisma.simulationRecord.create({
        data: {
          userId,
          facilityName: facility.name,
          coverageType: input.status,
          total,
          lines: lines.map((l) => ({ label: l.label, ok: l.ok, ticket: l.ticket ?? null })),
        },
      });
      saved = true;
    }
  } catch {
    saved = false;
  }

  return NextResponse.json({ lines, total, totalBilled, totalCovered, saved, facility: { name: facility.name, tier: facility.tier } });
}
