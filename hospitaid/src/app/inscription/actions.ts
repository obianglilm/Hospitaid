"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordProblem } from "@/lib/password";
import { createUserToken, USER_COOKIE_NAME, USER_COOKIE_MAX_AGE } from "@/lib/user-session";
import { cleanName, normalizeEmail, parseCoverage } from "@/lib/account-core";

export async function register(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const name = cleanName(String(formData.get("fullName") ?? ""));
  const coverage = parseCoverage(String(formData.get("coverage") ?? ""));
  const consent = formData.get("consent") === "on";

  if (!email) redirect("/inscription?error=email");
  const back = `/inscription?email=${encodeURIComponent(email)}`;
  if (!consent) redirect(`${back}&error=consent`);
  if (passwordProblem(password, email)) redirect(`${back}&error=password`);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect(`${back}&error=exists`);

  const passwordHash = await hashPassword(password);
  let userId: string | null = null;
  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName: name, defaultCoverageType: coverage },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    userId = null; // le plus souvent : e-mail créé entre-temps par une autre requête
  }
  if (!userId) redirect(`${back}&error=exists`);

  cookies().set(USER_COOKIE_NAME, await createUserToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: USER_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/mon-compte");
}
