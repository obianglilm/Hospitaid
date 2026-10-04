"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDummyHash, verifyPassword } from "@/lib/password";
import { createUserToken, USER_COOKIE_NAME, USER_COOKIE_MAX_AGE } from "@/lib/user-session";
import { clearFailures, getClientIp, isThrottled, recordFailure } from "@/lib/auth-throttle";
import { normalizeEmail, safeNextPath } from "@/lib/account-core";

export async function login(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const nextQuery = `&next=${encodeURIComponent(next)}`;

  if (!email || !password) redirect(`/connexion?error=invalid${nextQuery}`);

  const key = `login:${getClientIp()}:${email}`;
  if (await isThrottled(key)) redirect(`/connexion?error=throttled${nextQuery}`);

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  // Même travail de calcul que l'e-mail existe ou non (pas de fuite par le temps de réponse).
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    await recordFailure(key);
    redirect(`/connexion?error=invalid${nextQuery}`);
  }

  await clearFailures(key);
  cookies().set(USER_COOKIE_NAME, await createUserToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USER_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect(next);
}
