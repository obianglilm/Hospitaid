import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken, verifySessionToken, checkPassword } from "@/lib/admin-auth";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret-do-not-use-in-prod";
  process.env.ADMIN_PASSWORD = "correct-password";
});

describe("checkPassword", () => {
  it("accepte le bon mot de passe", () => expect(checkPassword("correct-password")).toBe(true));
  it("refuse un mauvais mot de passe", () => expect(checkPassword("wrong")).toBe(false));
  it("refuse si ADMIN_PASSWORD n'est pas configuré", () => {
    delete process.env.ADMIN_PASSWORD;
    expect(checkPassword("correct-password")).toBe(false);
  });
});

describe("createSessionToken / verifySessionToken", () => {
  it("un jeton fraîchement créé est valide", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });
  it("rejette un jeton vide ou absent", async () => {
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
  });
  it("rejette un jeton altéré (signature invalide)", async () => {
    const token = await createSessionToken();
    const tampered = token.slice(0, -2) + "00";
    expect(await verifySessionToken(tampered)).toBe(false);
  });
  it("rejette un jeton expiré", async () => {
    const past = Date.now() - 1000;
    const payload = `admin.${past}`;
    // recrée la même signature que le module (test volontairement couplé pour vérifier l'expiration)
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET!),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    expect(await verifySessionToken(`${payload}.${sigHex}`)).toBe(false);
  });
  it("rejette un jeton signé avec un autre secret", async () => {
    const token = await createSessionToken();
    process.env.ADMIN_SESSION_SECRET = "un-autre-secret";
    expect(await verifySessionToken(token)).toBe(false);
  });
});
