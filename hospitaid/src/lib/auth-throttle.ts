import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isLocked, nextAfterFailure } from "@/lib/throttle-core";

export function getClientIp(): string {
  const forwarded = headers().get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnue";
}

export async function isThrottled(key: string): Promise<boolean> {
  const row = await prisma.authThrottle.findUnique({ where: { key } });
  return isLocked(row, new Date());
}

export async function recordFailure(key: string): Promise<void> {
  const now = new Date();
  const row = await prisma.authThrottle.findUnique({ where: { key } });
  const next = nextAfterFailure(row, now);
  await prisma.authThrottle.upsert({
    where: { key },
    create: { key, failures: next.failures, windowStart: next.windowStart },
    update: { failures: next.failures, windowStart: next.windowStart },
  });
}

export async function clearFailures(key: string): Promise<void> {
  await prisma.authThrottle.deleteMany({ where: { key } });
}
