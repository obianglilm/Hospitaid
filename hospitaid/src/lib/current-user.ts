import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE_NAME, verifyUserToken } from "@/lib/user-session";

/** Identifiant de l'utilisateur connecté (vérifie la signature du cookie, sans accès base). */
export async function getCurrentUserId(): Promise<string | null> {
  return verifyUserToken(cookies().get(USER_COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, fullName: true, defaultCoverageType: true },
  });
}
