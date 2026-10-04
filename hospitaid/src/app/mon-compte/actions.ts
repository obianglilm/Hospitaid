"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/current-user";
import { USER_COOKIE_NAME } from "@/lib/user-session";
import { cleanName, parseCoverage } from "@/lib/account-core";

async function requireUserId(): Promise<string> {
  const id = await getCurrentUserId();
  if (!id) redirect("/connexion?next=/mon-compte");
  return id;
}

export async function updateProfile(formData: FormData) {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: cleanName(String(formData.get("fullName") ?? "")),
      defaultCoverageType: parseCoverage(String(formData.get("coverage") ?? "")),
    },
  });
  revalidatePath("/mon-compte");
  redirect("/mon-compte?saved=1");
}

export async function clearHistory() {
  const userId = await requireUserId();
  await prisma.simulationRecord.deleteMany({ where: { userId } });
  revalidatePath("/mon-compte");
  redirect("/mon-compte?cleared=1");
}

export async function logout() {
  cookies().delete(USER_COOKIE_NAME);
  redirect("/");
}

export async function deleteAccount(formData: FormData) {
  const userId = await requireUserId();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") {
    redirect("/mon-compte?error=confirm");
  }
  let deleted = true;
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    deleted = false; // ex. données liées à conserver : à traiter manuellement
  }
  if (!deleted) redirect("/mon-compte?error=delete");
  cookies().delete(USER_COOKIE_NAME);
  redirect("/?compte=supprime");
}
