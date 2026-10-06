// Coordonnées de HospitAid (modifiables par l'admin), utilisées dans l'en-tête des PDF.
export const SITE_INFO_KEY = "site_info";

export interface SiteInfo {
  website: string;
  email: string;
  phone: string;
  address: string;
}

export const DEFAULT_SITE_INFO: SiteInfo = { website: "hospitaid.vercel.app", email: "", phone: "", address: "" };

const clip = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export function parseSiteInfo(value: unknown): SiteInfo {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_SITE_INFO;
  const v = value as Record<string, unknown>;
  return {
    website: clip(v.website, 100) || DEFAULT_SITE_INFO.website,
    email: clip(v.email, 120),
    phone: clip(v.phone, 40),
    address: clip(v.address, 120),
  };
}

export function contactLines(info: SiteInfo): string[] {
  return [info.email, info.phone, info.address].filter((l) => l.length > 0);
}
