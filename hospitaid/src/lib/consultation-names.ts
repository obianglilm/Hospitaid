import { prisma } from "@/lib/prisma";
import { CONSULTATIONS, type ConsultationDef } from "@/lib/tier-tariffs";
import { CONSULTATION_OVERRIDES_KEY, applyOverrides, parseOverrides } from "@/lib/consultation-core";

export async function getEffectiveConsultations(): Promise<ConsultationDef[]> {
  const row = await prisma.systemSetting.findUnique({ where: { key: CONSULTATION_OVERRIDES_KEY } });
  return applyOverrides(CONSULTATIONS, parseOverrides(row?.value));
}
