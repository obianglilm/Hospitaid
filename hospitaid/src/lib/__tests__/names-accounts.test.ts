import { describe, it, expect } from "vitest";
import { normalizeText, searchTokens, buildSearchText, cleanDisplayName, parseSynonyms, relevanceScore, MAX_SYNONYMS } from "@/lib/names-core";
import { normalizeEmail, cleanName, parseCoverage, safeNextPath, summarizeLines } from "@/lib/account-core";
import { parseOverrides, applyOverrides } from "@/lib/consultation-core";
import { CONSULTATIONS } from "@/lib/tier-tariffs";

describe("recherche insensible aux accents et à la casse", () => {
  it("normalise", () => {
    expect(normalizeText("Glycémie à jeûn")).toBe("glycemie a jeun");
    expect(normalizeText("CŒUR – Écho (abdo.)")).toBe("coeur echo abdo");
    expect(searchTokens("  Échographie   abdominale ")).toEqual(["echographie", "abdominale"]);
  });
  it("retrouve nom officiel, nom usuel, synonymes et code", () => {
    const t = buildSearchText({ officialName: "GLUCOSE", displayName: "Prise de sang sucre", synonyms: ["Glycémie", "diabète"], code: "BBC S002279" });
    for (const q of ["glycemie", "diabete", "sucre", "glucose", "s002279", "prise de sang"]) {
      expect(searchTokens(q).every((tok) => t.includes(tok))).toBe(true);
    }
    expect(searchTokens("cholesterol").every((tok) => t.includes(tok))).toBe(false);
  });
  it("classe par pertinence", () => {
    const s = (label: string, syn: string[] = []) => relevanceScore({ label, synonyms: syn }, "echo");
    expect(s("Écho")).toBe(0);
    expect(s("Échographie abdominale")).toBe(1);
    expect(s("Contrôle échographique")).toBe(2);
    expect(s("Radiographie")).toBe(3);
    expect(s("Autre", ["écho"])).toBe(0);
  });
});

describe("noms saisis par l'admin", () => {
  it("nom usuel", () => {
    expect(cleanDisplayName("   ")).toBeNull();
    expect(cleanDisplayName("  Prise  de   sang  ")).toBe("Prise de sang");
    expect(cleanDisplayName("x".repeat(500))?.length).toBe(200);
  });
  it("mots-clés sans doublons ni excès", () => {
    expect(parseSynonyms("glycémie, Glycemie ; sucre\n taux de sucre,, a")).toEqual(["glycémie", "sucre", "taux de sucre"]);
    expect(parseSynonyms(Array.from({ length: 40 }, (_, i) => `mot${i}x`).join(",")).length).toBe(MAX_SYNONYMS);
  });
  it("consultations renommables, valeurs invalides écartées", () => {
    const ov = parseOverrides({ CONS_GENERALISTE: { label: "  Voir un médecin  ", synonyms: ["docteur", "médecin"] }, N_IMPORTE_QUOI: 12, CONS_DENTISTE: { label: 5 } });
    expect(ov.CONS_GENERALISTE?.label).toBe("Voir un médecin");
    expect(ov.N_IMPORTE_QUOI).toBeUndefined();
    const eff = applyOverrides(CONSULTATIONS, ov);
    expect(eff.find((c) => c.code === "CONS_GENERALISTE")?.label).toBe("Voir un médecin");
    expect(eff.length).toBe(12);
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides([1, 2])).toEqual({});
  });
});

describe("comptes", () => {
  it("e-mail, nom, statut", () => {
    expect(normalizeEmail("  Jean.Dupont@Mail.COM ")).toBe("jean.dupont@mail.com");
    for (const bad of ["", "abc", "a@b", "a b@c.de", "@x.fr", "x".repeat(260) + "@a.fr"]) expect(normalizeEmail(bad)).toBeNull();
    expect(cleanName("  Marie   Ndong ")).toBe("Marie Ndong");
    expect(parseCoverage("PLEIN_ALD")).toBe("PLEIN_ALD");
    expect(parseCoverage("ADMIN")).toBeNull();
  });
  it("redirection : uniquement vers une page interne (hors admin)", () => {
    expect(safeNextPath("/simulateur")).toBe("/simulateur");
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "simulateur", "/admin/examens", ""]) {
      expect(safeNextPath(bad)).toBe("/mon-compte");
    }
  });
  it("résumé d'historique", () => {
    expect(summarizeLines([{ label: "NFS", ok: true }, { x: 1 }, "z"])).toEqual(["NFS"]);
    expect(summarizeLines("pas un tableau")).toEqual([]);
  });
});
