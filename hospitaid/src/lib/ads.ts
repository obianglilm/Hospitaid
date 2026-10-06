import { prisma } from "@/lib/prisma";
import { isActiveNow } from "@/lib/ads-core";

export interface PartnerView {
  id: string;
  name: string;
  title: string;
  text: string;
  imageUrl: string | null;
  linkUrl: string | null;
}

export interface AnnouncementView {
  id: string;
  text: string;
  linkUrl: string | null;
}

/** Encarts partenaires actifs aujourd'hui. Ne bloque jamais l'affichage d'une page. */
export async function getActivePartners(limit = 6): Promise<PartnerView[]> {
  try {
    const now = new Date();
    const rows = await prisma.partner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows
      .filter((r) => isActiveNow(r, now))
      .slice(0, limit)
      .map((r) => ({ id: r.id, name: r.name, title: r.title, text: r.text, imageUrl: r.imageUrl, linkUrl: r.linkUrl }));
  } catch {
    return [];
  }
}

export async function getActiveAnnouncements(limit = 10): Promise<AnnouncementView[]> {
  try {
    const now = new Date();
    const rows = await prisma.announcement.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows
      .filter((r) => isActiveNow(r, now))
      .slice(0, limit)
      .map((r) => ({ id: r.id, text: r.text, linkUrl: r.linkUrl }));
  } catch {
    return [];
  }
}
