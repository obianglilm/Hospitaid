import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, passwordProblem } from "@/lib/password";
import { createUserToken, verifyUserToken } from "@/lib/user-session";
import { createSessionToken, verifySessionToken } from "@/lib/admin-auth";
import { isLocked, nextAfterFailure, minutesLeft, THROTTLE_MAX_FAILURES, THROTTLE_WINDOW_MS, type ThrottleRow } from "@/lib/throttle-core";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "secret-de-test-long-et-aleatoire";
});

describe("mots de passe", () => {
  it("accepte le bon, refuse le mauvais, sel différent à chaque hachage", async () => {
    const h1 = await hashPassword("Un-Bon-Mot-De-Passe-42");
    const h2 = await hashPassword("Un-Bon-Mot-De-Passe-42");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("Un-Bon-Mot-De-Passe-42", h1)).toBe(true);
    expect(await verifyPassword("un-bon-mot-de-passe-42", h1)).toBe(false);
    expect(await verifyPassword("x", "n-importe-quoi")).toBe(false);
  });
  it("règles de robustesse", () => {
    expect(passwordProblem("court", "a@b.cd")).not.toBeNull();
    expect(passwordProblem("aaaaaaaaaaaa", "a@b.cd")).not.toBeNull();
    expect(passwordProblem("x".repeat(200), "a@b.cd")).not.toBeNull();
    expect(passwordProblem("Libreville-Mango-7", "a@b.cd")).toBeNull();
  });
});

describe("sessions", () => {
  it("jeton utilisateur valide, falsifié, d'un autre secret", async () => {
    const t = await createUserToken("cl123abc");
    expect(await verifyUserToken(t)).toBe("cl123abc");
    expect(await verifyUserToken(t.slice(0, -2) + "00")).toBeNull();
    expect(await verifyUserToken(t.replace("cl123abc", "autre-user"))).toBeNull();
    expect(await verifyUserToken(undefined)).toBeNull();
    process.env.ADMIN_SESSION_SECRET = "autre-secret";
    expect(await verifyUserToken(t)).toBeNull();
  });
  it("un jeton utilisateur n'ouvre pas l'admin, et inversement", async () => {
    const u = await createUserToken("cl123abc");
    const a = await createSessionToken();
    expect(await verifySessionToken(u)).toBe(false);
    expect(await verifyUserToken(a)).toBeNull();
    expect(await verifySessionToken(a)).toBe(true);
  });
});

describe("limitation des tentatives", () => {
  it("bloque après 5 échecs, libère après la fenêtre", () => {
    const t0 = new Date("2026-10-02T10:00:00Z");
    let row: ThrottleRow | null = null;
    for (let i = 1; i < THROTTLE_MAX_FAILURES; i++) {
      row = nextAfterFailure(row, t0);
      expect(isLocked(row, t0)).toBe(false);
    }
    row = nextAfterFailure(row, t0);
    expect(isLocked(row, t0)).toBe(true);
    expect(minutesLeft(row, t0)).toBe(15);
    const later = new Date(t0.getTime() + THROTTLE_WINDOW_MS + 1000);
    expect(isLocked(row, later)).toBe(false);
    expect(nextAfterFailure(row, later)).toEqual({ failures: 1, windowStart: later });
  });
});
