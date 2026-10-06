"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordProblem } from "@/lib/password";
import { createUserToken, USER_COOKIE_NAME, USER_COOKIE_MAX_AGE } from "@/lib/user-session";
import { cleanName, normalizeUsername, parseCoverage } from "@/lib/account-core";

export async function register(formData: FormData) {
  const rawUsername = String(formData.get("username") ?? "");
  const username = normalizeUsername(rawUsername);
  const password = String(formData.get("password") ?? "");
  const name = cleanName(String(formData.get("fullName") ?? ""));
  const coverage = parseCoverage(String(formData.get("coverage") ?? ""));
  const consent = formData.get("consent") === "on";

  const keep = `username=${encodeURIComponent(rawUsername.slice(0, 40))}`;
  if (!username) redirect(`/inscription?error=username&${keep}`);
  if (!consent) redirect(`/inscription?error=consent&${keep}`);
  if (passwordProblem(password, username)) redirect(`/inscription?error=password&${keep}`);

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) redirect(`/inscription?error=exists&${keep}`);

  const passwordHash = await hashPassword(password);
  let userId: string | null = null;
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash, fullName: name, defaultCoverageType: coverage },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    userId = null; // le plus souvent : identifiant créé entre-temps par une autre personne
  }
  if (!userId) redirect(`/inscription?error=exists&${keep}`);

  cookies().set(USER_COOKIE_NAME, await createUserToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USER_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/mon-compte");
}
