"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE } from "@/lib/admin-auth";
import { clearFailures, getClientIp, isThrottled, recordFailure } from "@/lib/auth-throttle";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const key = `admin:${getClientIp()}`;
  if (await isThrottled(key)) redirect("/admin/login?error=throttled");
  if (!checkPassword(password)) {
    await recordFailure(key);
    redirect("/admin/login?error=1");
  }
  await clearFailures(key);
  const token = await createSessionToken();
  cookies().set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
  redirect("/admin");
}

export async function logout() {
  cookies().delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}
