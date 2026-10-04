"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { buildSearchText, cleanDisplayName, parseSynonyms } from "@/lib/names-core";
import { CONSULTATIONS } from "@/lib/tier-tariffs";
import { CONSULTATION_OVERRIDES_KEY, parseOverrides, type ConsultationOverrides } from "@/lib/consultation-core";

const asJson = (v: unknown) => v as Prisma.InputJsonObject;

// Défense en profondeur : même si le middleware protège déjà /admin, chaque
// action re-vérifie la session côté serveur avant de toucher à la base.
async function requireAdmin() {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    throw new Error("Non autorisé.");
  }
}

export async function markExamVerified(examId: string) {
  await requireAdmin();
  await prisma.exam.update({ where: { id: examId }, data: { status: "VERIFIE" } });
  revalidatePath("/admin");
}

export async function markFacilityVerified(facilityId: string) {
  await requireAdmin();
  await prisma.healthFacility.update({ where: { id: facilityId }, data: { verifiedAt: new Date() } });
  revalidatePath("/admin");
}

export async function addFacility(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const typeCode = String(formData.get("typeCode") ?? "PUBLIC");
  const tier = String(formData.get("tier") ?? "") || null;
  const city = String(formData.get("city") ?? "Libreville").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) return;

  const type = await prisma.facilityType.findUnique({ where: { code: typeCode } });
  if (!type) return;

  await prisma.healthFacility.create({
    data: {
      name,
      typeId: type.id,
      tier: tier as any,
      city,
      address,
      phone,
      status: "ACTIVE",
      verifiedAt: null,
      sourceNote: "Ajouté manuellement via l'espace admin",
    },
  });
  revalidatePath("/admin");
  revalidatePath("/etablissements");
}

/** Modifie le nom usuel et les synonymes d'un acte (le libellé officiel n'est jamais modifié). */
export async function updateExamNames(formData: FormData) {
  await requireAdmin();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return;
  const displayName = cleanDisplayName(String(formData.get("displayName") ?? ""));
  const synonyms = parseSynonyms(String(formData.get("synonyms") ?? ""));

  const before = await prisma.exam.findUnique({
    where: { id: examId },
    select: { officialName: true, displayName: true, synonyms: true, nomenclatureCode: { select: { code: true } } },
  });
  if (!before) return;

  await prisma.exam.update({
    where: { id: examId },
    data: {
      displayName,
      synonyms,
      namesEditedAt: new Date(),
      searchText: buildSearchText({
        officialName: before.officialName,
        displayName,
        synonyms,
        code: before.nomenclatureCode?.code ?? null,
      }),
    },
  });
  // Traçabilité : qui (admin), quoi, avant/après.
  await prisma.auditLog.create({
    data: {
      action: "EXAM_NAMES_UPDATE",
      entityType: "Exam",
      entityId: examId,
      before: { displayName: before.displayName, synonyms: before.synonyms },
      after: { displayName, synonyms },
    },
  });
  revalidatePath("/admin/examens");
  revalidatePath("/simulateur");
}

/** Modifie le nom usuel et les synonymes d'une consultation / prestation forfaitaire. */
export async function updateConsultationNames(formData: FormData) {
  await requireAdmin();
  const code = String(formData.get("code") ?? "");
  const def = CONSULTATIONS.find((c) => c.code === code);
  if (!def) return;
  const label = cleanDisplayName(String(formData.get("label") ?? ""));
  const synonyms = parseSynonyms(String(formData.get("synonyms") ?? ""));

  const row = await prisma.systemSetting.findUnique({ where: { key: CONSULTATION_OVERRIDES_KEY } });
  const overrides: ConsultationOverrides = parseOverrides(row?.value);
  const before = overrides[code] ?? null;
  overrides[code] = { ...(label ? { label } : {}), synonyms };

  await prisma.systemSetting.upsert({
    where: { key: CONSULTATION_OVERRIDES_KEY },
    create: { key: CONSULTATION_OVERRIDES_KEY, value: asJson(overrides) },
    update: { value: asJson(overrides) },
  });
  await prisma.auditLog.create({
    data: {
      action: "CONSULTATION_NAMES_UPDATE",
      entityType: "Consultation",
      entityId: code,
      before: before ? asJson(before) : undefined,
      after: asJson(overrides[code] ?? {}),
    },
  });
  revalidatePath("/admin/examens");
  revalidatePath("/simulateur");
}
