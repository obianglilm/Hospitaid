import { prisma } from "@/lib/prisma";
import { EXCLUSIONS_KEY, parseExclusions, type CoverageExclusions } from "@/lib/exclusions-core";
import { SITE_INFO_KEY, parseSiteInfo, type SiteInfo } from "@/lib/site-info-core";

export async function getCoverageExclusions(): Promise<CoverageExclusions> {
  const row = await prisma.systemSetting.findUnique({ where: { key: EXCLUSIONS_KEY } });
  return parseExclusions(row?.value);
}

export async function getSiteInfo(): Promise<SiteInfo> {
  const row = await prisma.systemSetting.findUnique({ where: { key: SITE_INFO_KEY } });
  return parseSiteInfo(row?.value);
}
