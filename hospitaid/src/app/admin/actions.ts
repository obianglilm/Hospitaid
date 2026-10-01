"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";

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
