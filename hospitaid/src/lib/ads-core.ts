// Espace partenaires et bande d'annonces : validation du contenu saisi par l'admin.
export interface Schedulable {
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

/** Seules les adresses https:// sont acceptées (pas de javascript:, data:, http:). */
export function safeHttpsUrl(raw: string): string | null {
  const v = raw.trim();
  if (v.length === 0 || v.length > 500) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.hostname.length === 0 || u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function cleanAdText(raw: string, max: number): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, max);
}

export function isActiveNow(row: Schedulable, now: Date): boolean {
  if (!row.active) return false;
  if (row.startsAt && now < row.startsAt) return false;
  if (row.endsAt && now > row.endsAt) return false;
  return true;
}

/** « 2026-10-12 » → début ou fin de journée à Libreville (UTC+1). Vide/invalide → null. */
export function parseDateInput(raw: string, endOfDay: boolean): Date | null {
  const v = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T${endOfDay ? "23:59:59" : "00:00:00"}+01:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseSortOrder(raw: string): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 0;
}
