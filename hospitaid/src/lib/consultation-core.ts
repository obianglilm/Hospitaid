// Noms modifiables des consultations/prestations forfaitaires (stockés en base dans
// SystemSetting). Logique pure : validation et application des surcharges.
import type { ConsultationDef } from "./tier-tariffs";
import { cleanDisplayName, parseSynonyms } from "./names-core";

export const CONSULTATION_OVERRIDES_KEY = "consultation_overrides";

export interface ConsultationOverride {
  label?: string;
  synonyms?: string[];
}
export type ConsultationOverrides = Record<string, ConsultationOverride>;

/** Relit la valeur JSON stockée en base en écartant tout ce qui n'a pas la bonne forme. */
export function parseOverrides(value: unknown): ConsultationOverrides {
  const out: ConsultationOverrides = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  for (const [code, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as { label?: unknown; synonyms?: unknown };
    const o: ConsultationOverride = {};
    if (typeof r.label === "string") {
      const label = cleanDisplayName(r.label);
      if (label) o.label = label;
    }
    if (Array.isArray(r.synonyms)) {
      o.synonyms = parseSynonyms(r.synonyms.filter((x): x is string => typeof x === "string").join(","));
    }
    out[code] = o;
  }
  return out;
}

export function applyOverrides(defs: ConsultationDef[], overrides: ConsultationOverrides): ConsultationDef[] {
  return defs.map((d) => {
    const o = overrides[d.code];
    if (!o) return d;
    return { ...d, label: o.label ?? d.label, synonyms: o.synonyms ?? d.synonyms };
  });
}
