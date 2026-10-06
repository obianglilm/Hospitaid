"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { buildSearchText, cleanDisplayName, parseSynonyms } from "@/lib/names-core";
import { CONSULTATIONS } from "@/lib/tier-tariffs";
import { hashPassword, passwordProblem } from "@/lib/password";
import { parseAmount, parseMargin } from "@/lib/price-core";
import { EXCLUSIONS_KEY, type CoverageExclusions } from "@/lib/exclusions-core";
import { SITE_INFO_KEY, parseSiteInfo } from "@/lib/site-info-core";
import { cleanAdText, parseDateInput, parseSortOrder, safeHttpsUrl } from "@/lib/ads-core";
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

// ───────────────────────── Utilisateurs ─────────────────────────

/** Sans e-mail de récupération, c'est l'admin qui attribue un nouveau mot de passe provisoire. */
export async function resetUserPassword(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, email: true } });
  if (!user) redirect("/admin/utilisateurs?error=notfound");
  const ident = user.username ?? user.email ?? "";
  if (passwordProblem(newPassword, ident)) redirect("/admin/utilisateurs?error=password");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await prisma.auditLog.create({
    data: { action: "USER_PASSWORD_RESET", entityType: "User", entityId: user.id, after: asJson({ note: "mot de passe réinitialisé par l'admin" }) },
  });
  revalidatePath("/admin/utilisateurs");
  redirect(`/admin/utilisateurs?reset=${encodeURIComponent(ident)}`);
}

// ───────────────────────── Prix ─────────────────────────

export async function updateFacilityMargin(formData: FormData) {
  await requireAdmin();
  const facilityId = String(formData.get("facilityId") ?? "");
  const margin = parseMargin(String(formData.get("marginPercent") ?? ""));
  const before = await prisma.healthFacility.findUnique({ where: { id: facilityId }, select: { marginPercent: true } });
  if (!before || margin === null) redirect("/admin/prix?error=margin");
  await prisma.healthFacility.update({ where: { id: facilityId }, data: { marginPercent: margin } });
  await prisma.auditLog.create({
    data: { action: "FACILITY_MARGIN_UPDATE", entityType: "HealthFacility", entityId: facilityId, before: asJson({ marginPercent: before.marginPercent }), after: asJson({ marginPercent: margin }) },
  });
  revalidatePath("/admin/prix");
  redirect("/admin/prix?saved=margin");
}

export async function savePriceOverride(formData: FormData) {
  await requireAdmin();
  const kind = formData.get("kind") === "CONSULTATION" ? "CONSULTATION" : "EXAM";
  const targetKey = String(formData.get("targetKey") ?? "").slice(0, 60);
  const scope = String(formData.get("scope") ?? "ALL").slice(0, 60);
  const refRaw = String(formData.get("referenceAmount") ?? "").trim();
  const billRaw = String(formData.get("billedAmount") ?? "").trim();
  const referenceAmount = refRaw ? parseAmount(refRaw) : null;
  const billedAmount = billRaw ? parseAmount(billRaw) : null;
  if ((refRaw && referenceAmount === null) || (billRaw && billedAmount === null)) redirect("/admin/prix?error=amount");

  const targetExists =
    kind === "CONSULTATION"
      ? CONSULTATIONS.some((c) => c.code === targetKey)
      : !!(await prisma.exam.findUnique({ where: { id: targetKey }, select: { id: true } }));
  if (!targetExists) redirect("/admin/prix?error=target");
  if (scope !== "ALL" && !(await prisma.healthFacility.findUnique({ where: { id: scope }, select: { id: true } }))) {
    redirect("/admin/prix?error=scope");
  }

  const where = { scope_kind_targetKey: { scope, kind, targetKey } };
  const before = await prisma.priceOverride.findUnique({ where });
  if (referenceAmount === null && billedAmount === null) {
    if (before) await prisma.priceOverride.delete({ where });
  } else {
    await prisma.priceOverride.upsert({
      where,
      create: { scope, kind, targetKey, referenceAmount, billedAmount },
      update: { referenceAmount, billedAmount },
    });
  }
  await prisma.auditLog.create({
    data: {
      action: "PRICE_OVERRIDE_SAVE",
      entityType: kind,
      entityId: targetKey,
      before: before ? asJson({ scope, referenceAmount: before.referenceAmount, billedAmount: before.billedAmount }) : undefined,
      after: asJson({ scope, referenceAmount, billedAmount }),
    },
  });
  revalidatePath("/admin/prix");
  redirect("/admin/prix?saved=override");
}

export async function deletePriceOverride(id: string) {
  await requireAdmin();
  const before = await prisma.priceOverride.findUnique({ where: { id } });
  if (!before) return;
  await prisma.priceOverride.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { action: "PRICE_OVERRIDE_DELETE", entityType: before.kind, entityId: before.targetKey, before: asJson({ scope: before.scope, referenceAmount: before.referenceAmount, billedAmount: before.billedAmount }) },
  });
  revalidatePath("/admin/prix");
}

// ───────────────────────── Paramètres ─────────────────────────

export async function saveExclusions(formData: FormData) {
  await requireAdmin();
  const validLetters = new Set((await prisma.lettreCle.findMany({ select: { code: true } })).map((l) => l.code));
  const validConsults = new Set(CONSULTATIONS.map((c) => c.code));
  const value: CoverageExclusions = {
    letterCodes: formData.getAll("letter").map(String).filter((c) => validLetters.has(c)),
    consultationCodes: formData.getAll("consult").map(String).filter((c) => validConsults.has(c)),
  };
  const before = await prisma.systemSetting.findUnique({ where: { key: EXCLUSIONS_KEY } });
  await prisma.systemSetting.upsert({
    where: { key: EXCLUSIONS_KEY },
    create: { key: EXCLUSIONS_KEY, value: asJson(value) },
    update: { value: asJson(value) },
  });
  await prisma.auditLog.create({
    data: { action: "COVERAGE_EXCLUSIONS_SAVE", entityType: "SystemSetting", entityId: EXCLUSIONS_KEY, before: before ? asJson(before.value) : undefined, after: asJson(value) },
  });
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?saved=exclusions");
}

export async function saveSiteInfo(formData: FormData) {
  await requireAdmin();
  const value = parseSiteInfo({
    website: String(formData.get("website") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    address: String(formData.get("address") ?? ""),
  });
  await prisma.systemSetting.upsert({
    where: { key: SITE_INFO_KEY },
    create: { key: SITE_INFO_KEY, value: asJson(value) },
    update: { value: asJson(value) },
  });
  revalidatePath("/admin/parametres");
  redirect("/admin/parametres?saved=site");
}

// ───────────────────────── Partenaires et annonces ─────────────────────────

function readPartner(formData: FormData) {
  const name = cleanAdText(String(formData.get("name") ?? ""), 60);
  const title = cleanAdText(String(formData.get("title") ?? ""), 80);
  const text = cleanAdText(String(formData.get("text") ?? ""), 300);
  const imageRaw = String(formData.get("imageUrl") ?? "").trim();
  const linkRaw = String(formData.get("linkUrl") ?? "").trim();
  const imageUrl = imageRaw ? safeHttpsUrl(imageRaw) : null;
  const linkUrl = linkRaw ? safeHttpsUrl(linkRaw) : null;
  if (!name || !title || (imageRaw && !imageUrl) || (linkRaw && !linkUrl)) return null;
  return {
    name,
    title,
    text,
    imageUrl,
    linkUrl,
    active: formData.get("active") === "on",
    sortOrder: parseSortOrder(String(formData.get("sortOrder") ?? "0")),
    startsAt: parseDateInput(String(formData.get("startsAt") ?? ""), false),
    endsAt: parseDateInput(String(formData.get("endsAt") ?? ""), true),
  };
}

export async function addPartner(formData: FormData) {
  await requireAdmin();
  const data = readPartner(formData);
  if (!data) redirect("/admin/annonces?error=partner");
  await prisma.partner.create({ data });
  revalidatePath("/admin/annonces");
  revalidatePath("/");
  redirect("/admin/annonces?saved=partner");
}

export async function updatePartner(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readPartner(formData);
  if (!data) redirect("/admin/annonces?error=partner");
  await prisma.partner.update({ where: { id }, data });
  revalidatePath("/admin/annonces");
  revalidatePath("/");
  redirect("/admin/annonces?saved=partner");
}

export async function deletePartner(id: string) {
  await requireAdmin();
  await prisma.partner.deleteMany({ where: { id } });
  revalidatePath("/admin/annonces");
  revalidatePath("/");
}

function readAnnouncement(formData: FormData) {
  const text = cleanAdText(String(formData.get("text") ?? ""), 160);
  const linkRaw = String(formData.get("linkUrl") ?? "").trim();
  const linkUrl = linkRaw ? safeHttpsUrl(linkRaw) : null;
  if (!text || (linkRaw && !linkUrl)) return null;
  return {
    text,
    linkUrl,
    active: formData.get("active") === "on",
    sortOrder: parseSortOrder(String(formData.get("sortOrder") ?? "0")),
    startsAt: parseDateInput(String(formData.get("startsAt") ?? ""), false),
    endsAt: parseDateInput(String(formData.get("endsAt") ?? ""), true),
  };
}

export async function addAnnouncement(formData: FormData) {
  await requireAdmin();
  const data = readAnnouncement(formData);
  if (!data) redirect("/admin/annonces?error=announcement");
  await prisma.announcement.create({ data });
  revalidatePath("/admin/annonces");
  revalidatePath("/", "layout");
  redirect("/admin/annonces?saved=announcement");
}

export async function updateAnnouncement(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readAnnouncement(formData);
  if (!data) redirect("/admin/annonces?error=announcement");
  await prisma.announcement.update({ where: { id }, data });
  revalidatePath("/admin/annonces");
  revalidatePath("/", "layout");
  redirect("/admin/annonces?saved=announcement");
}

export async function deleteAnnouncement(id: string) {
  await requireAdmin();
  await prisma.announcement.deleteMany({ where: { id } });
  revalidatePath("/admin/annonces");
  revalidatePath("/", "layout");
}
