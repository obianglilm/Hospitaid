// Validation de la demande de simulation (logique pure, partagée par l'écran et le PDF).
import { DEFAULT_COVERAGE_RATES, type CoverageType } from "./pricing-core";
import { cleanName } from "./account-core";

export const MAX_ITEMS = 30;

export interface SimulationItem {
  kind: "exam" | "consultation";
  id?: string;
  code?: string;
}

export interface SimulationInput {
  items: SimulationItem[];
  facilityId: string;
  status: CoverageType;
  patientName: string | null;
}

const VALID_STATUSES = Object.keys(DEFAULT_COVERAGE_RATES);
const short = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 && v.length <= 60 ? v : undefined);

export function parseSimulationInput(body: unknown): SimulationInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as { items?: unknown; facilityId?: unknown; status?: unknown; patientName?: unknown };
  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > MAX_ITEMS) return null;
  const facilityId = short(b.facilityId);
  if (!facilityId || typeof b.status !== "string" || !VALID_STATUSES.includes(b.status)) return null;

  const items: SimulationItem[] = [];
  for (const raw of b.items) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as { kind?: unknown; id?: unknown; code?: unknown };
    if (r.kind === "exam" && short(r.id)) items.push({ kind: "exam", id: short(r.id) });
    else if (r.kind === "consultation" && short(r.code)) items.push({ kind: "consultation", code: short(r.code) });
  }
  if (items.length === 0) return null;
  return {
    items,
    facilityId,
    status: b.status as CoverageType,
    patientName: typeof b.patientName === "string" ? cleanName(b.patientName) : null,
  };
}
