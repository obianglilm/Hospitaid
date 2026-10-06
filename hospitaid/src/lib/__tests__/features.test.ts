import { describe, it, expect } from "vitest";
import { normalizeUsername, parseLoginIdentifier } from "@/lib/account-core";
import { passwordProblem } from "@/lib/password";
import { DEFAULT_EXCLUSIONS, isConsultationExcluded, isExamExcluded, parseExclusions } from "@/lib/exclusions-core";
import { DEFAULT_COVERAGE_RATES, priceLine } from "@/lib/pricing-core";
import { applyMargin, parseAmount, parseMargin, pickOverride, resolveAmounts, type OverrideRow } from "@/lib/price-core";
import { isActiveNow, parseDateInput, safeHttpsUrl } from "@/lib/ads-core";
import { contactLines, DEFAULT_SITE_INFO, parseSiteInfo } from "@/lib/site-info-core";
import { parseSimulationInput } from "@/lib/simulation-core";
import { textWidth, toWinAnsi, wrapText } from "@/lib/pdf-writer";
import { buildSimulationPdf, type ReportData } from "@/lib/pdf-report";

describe("identifiants sans e-mail", () => {
  it("normalise : accents, majuscules, espaces", () => {
    expect(normalizeUsername("  Marie Ndong ")).toBe("marie.ndong");
    expect(normalizeUsername("Éric-Obiang_2")).toBe("eric-obiang_2");
    for (const bad of ["", "ab", "a b!", "x".repeat(31), "admin", "Administrateur", "-abc", "€uro"]) expect(normalizeUsername(bad)).toBeNull();
  });
  it("connexion : nom d'utilisateur, ou e-mail pour les anciens comptes", () => {
    expect(parseLoginIdentifier("Marie Ndong")).toEqual({ kind: "username", value: "marie.ndong" });
    expect(parseLoginIdentifier(" Jean@Mail.com ")).toEqual({ kind: "email", value: "jean@mail.com" });
    expect(parseLoginIdentifier("pas@valide")).toBeNull();
  });
  it("mot de passe : une date de naissance est acceptée, pas les mots de passe triviaux", () => {
    expect(passwordProblem("15031985", "marie.ndong")).toBeNull();
    expect(passwordProblem("12/03/1985", "marie.ndong")).toBeNull();
    for (const bad of ["12345", "123456", "000000", "aaaaaaaa", "Motdepasse", "marie.ndong"]) expect(passwordProblem(bad, "marie.ndong")).not.toBeNull();
  });
});

describe("soins infirmiers (AMI) non pris en charge", () => {
  it("par défaut : lettre-clé AMI et visite d'infirmier", () => {
    expect(isExamExcluded(DEFAULT_EXCLUSIONS, "AMI")).toBe(true);
    expect(isExamExcluded(DEFAULT_EXCLUSIONS, "B")).toBe(false);
    expect(isExamExcluded(DEFAULT_EXCLUSIONS, null)).toBe(false);
    expect(isConsultationExcluded(DEFAULT_EXCLUSIONS, "CONS_INFIRMIER")).toBe(true);
    expect(isConsultationExcluded(DEFAULT_EXCLUSIONS, "CONS_GENERALISTE")).toBe(false);
  });
  it("réglage de l'admin : liste vide respectée, valeurs invalides écartées, absence = défaut", () => {
    expect(parseExclusions(undefined)).toEqual(DEFAULT_EXCLUSIONS);
    expect(parseExclusions({ letterCodes: [], consultationCodes: [] })).toEqual({ letterCodes: [], consultationCodes: [] });
    expect(parseExclusions({ letterCodes: ["AMK", "x y", 5], consultationCodes: "non" })).toEqual({ letterCodes: ["AMK"], consultationCodes: [] });
  });
  it("le patient paie tout, quel que soit son statut (même exonéré)", () => {
    for (const status of ["EXONERE", "PLEIN", "PLEIN_ALD", "PAF"] as const) {
      const r = priceLine({ referenceAmount: 3500, billedAmount: 3500, status, rates: DEFAULT_COVERAGE_RATES, notCovered: true });
      expect(r.ok && r.ticket).toBe(3500);
      expect(r.ok && r.coveredAmount).toBe(0);
      expect(r.ok && r.notCovered).toBe(true);
    }
    const covered = priceLine({ referenceAmount: 3500, billedAmount: 3500, status: "PLEIN", rates: DEFAULT_COVERAGE_RATES });
    expect(covered.ok && covered.ticket).toBe(700);
  });
});

describe("marges et ajustements de prix", () => {
  it("la marge majore le prix facturé, pas le tarif conventionné", () => {
    expect(applyMargin(1875, 10)).toBe(2063); // 2062,5 arrondi
    expect(applyMargin(7500, 0)).toBe(7500);
    const a = resolveAmounts({ reference: 7500, baseBilled: null, marginPercent: 20, override: null });
    expect(a).toEqual({ reference: 7500, billed: 9000, adjusted: true });
    // ticket à 80 % : 9000 − 6000 = 3000 (le supplément reste à la charge du patient)
    const p = priceLine({ referenceAmount: a!.reference, billedAmount: a!.billed, status: "PLEIN", rates: DEFAULT_COVERAGE_RATES });
    expect(p.ok && p.ticket).toBe(3000);
  });
  it("la marge s'ajoute au prix facturé du barème (consultations du privé)", () => {
    expect(resolveAmounts({ reference: 7500, baseBilled: 15000, marginPercent: 10, override: null })?.billed).toBe(16500);
  });
  it("un prix fixé par l'admin l'emporte sur la marge ; un tarif conventionné corrigé aussi", () => {
    expect(resolveAmounts({ reference: 1875, baseBilled: null, marginPercent: 50, override: { referenceAmount: null, billedAmount: 2500 } })?.billed).toBe(2500);
    const r = resolveAmounts({ reference: null, baseBilled: null, marginPercent: 0, override: { referenceAmount: 4000, billedAmount: null } });
    expect(r).toEqual({ reference: 4000, billed: 4000, adjusted: true });
    expect(resolveAmounts({ reference: null, baseBilled: null, marginPercent: 0, override: null })).toBeNull();
    expect(resolveAmounts({ reference: 1000, baseBilled: null, marginPercent: 0, override: null })?.adjusted).toBe(false);
  });
  it("l'ajustement d'un établissement l'emporte sur « tous les établissements »", () => {
    const rows: OverrideRow[] = [
      { scope: "ALL", kind: "EXAM", targetKey: "e1", referenceAmount: null, billedAmount: 3000 },
      { scope: "f1", kind: "EXAM", targetKey: "e1", referenceAmount: null, billedAmount: 4000 },
    ];
    expect(pickOverride(rows, "f1", "EXAM", "e1")?.billedAmount).toBe(4000);
    expect(pickOverride(rows, "f2", "EXAM", "e1")?.billedAmount).toBe(3000);
    expect(pickOverride(rows, "f1", "CONSULTATION", "e1")).toBeNull();
  });
  it("saisies de l'admin", () => {
    expect(parseAmount("12 500")).toBe(12500);
    for (const bad of ["", "abc", "-5", "1.5", "1000000000"]) expect(parseAmount(bad)).toBeNull();
    expect(parseMargin("15")).toBe(15);
    expect(parseMargin("12,5")).toBe(13);
    for (const bad of ["", "-1", "301", "abc"]) expect(parseMargin(bad)).toBeNull();
  });
});

describe("partenaires, annonces, coordonnées", () => {
  it("seules les adresses https sont acceptées", () => {
    expect(safeHttpsUrl("https://exemple.ga/page?x=1")).toBe("https://exemple.ga/page?x=1");
    for (const bad of ["http://exemple.ga", "javascript:alert(1)", "data:text/html,x", "//exemple.ga", "https://user:pw@exemple.ga", "", "pas une adresse"]) {
      expect(safeHttpsUrl(bad)).toBeNull();
    }
  });
  it("période d'affichage (heure de Libreville)", () => {
    const start = parseDateInput("2026-10-12", false);
    const end = parseDateInput("2026-10-12", true);
    expect(start?.toISOString()).toBe("2026-10-11T23:00:00.000Z");
    expect(end?.toISOString()).toBe("2026-10-12T22:59:59.000Z");
    expect(parseDateInput("12/10/2026", false)).toBeNull();
    const row = { active: true, startsAt: start, endsAt: end };
    expect(isActiveNow(row, new Date("2026-10-12T12:00:00Z"))).toBe(true);
    expect(isActiveNow(row, new Date("2026-10-11T12:00:00Z"))).toBe(false);
    expect(isActiveNow(row, new Date("2026-10-13T12:00:00Z"))).toBe(false);
    expect(isActiveNow({ ...row, active: false }, new Date("2026-10-12T12:00:00Z"))).toBe(false);
    expect(isActiveNow({ active: true, startsAt: null, endsAt: null }, new Date())).toBe(true);
  });
  it("coordonnées du service", () => {
    expect(parseSiteInfo(null)).toEqual(DEFAULT_SITE_INFO);
    const info = parseSiteInfo({ website: " hospitaid.ga ", email: "a@b.ga", phone: "", address: "Libreville" });
    expect(info.website).toBe("hospitaid.ga");
    expect(contactLines(info)).toEqual(["a@b.ga", "Libreville"]);
  });
});

describe("demande de simulation", () => {
  it("accepte une demande valide, rejette le reste", () => {
    const ok = parseSimulationInput({ items: [{ kind: "exam", id: "e1" }, { kind: "consultation", code: "CONS_GENERALISTE" }, { kind: "bidon" }], facilityId: "f1", status: "PLEIN", patientName: "  Marie  Ndong " });
    expect(ok?.items.length).toBe(2);
    expect(ok?.patientName).toBe("Marie Ndong");
    for (const bad of [null, {}, { items: [], facilityId: "f", status: "PLEIN" }, { items: [{ kind: "exam", id: "e" }], facilityId: "f", status: "ADMIN" }, { items: Array.from({ length: 31 }, () => ({ kind: "exam", id: "e" })), facilityId: "f", status: "PLEIN" }]) {
      expect(parseSimulationInput(bad)).toBeNull();
    }
  });
});

describe("génération du PDF", () => {
  it("encodage et mesures", () => {
    expect(toWinAnsi("é€œ—")).toEqual([0xe9, 0x80, 0x9c, 0x97]);
    expect(toWinAnsi("1\u202f000")).toEqual([49, 0xa0, 48, 48, 48]);
    expect(toWinAnsi("−5")).toEqual([0x2d, 53]);
    expect(toWinAnsi("日")).toEqual([63]);
    expect(textWidth("é", "F1", 10)).toBe(textWidth("e", "F1", 10));
    expect(textWidth("Total", "F2", 10)).toBeGreaterThan(textWidth("Total", "F1", 10));
  });
  it("retour à la ligne", () => {
    const lines = wrapText("Hémogramme avec numération des hématies et des leucocytes", "F1", 10, 120);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(textWidth(l, "F1", 10)).toBeLessThan(121);
    expect(wrapText("Supercalifragilisticexpialidocious".repeat(3), "F1", 10, 100).every((l) => textWidth(l, "F1", 10) <= 100)).toBe(true);
  });
  const base: Omit<ReportData, "lines" | "totals"> = {
    generatedAt: new Date("2026-10-05T14:32:00Z"),
    site: { name: "HospitAid", tagline: "Parce que chaque patient compte.", website: "hospitaid.vercel.app", contactLines: [] },
    patient: { name: "Marie Ndong", username: "marie.ndong", coverageLabel: "Plein", coverageRate: 80 },
    facility: { name: "CHUL", typeLabel: "Établissement public", city: "Libreville", address: null, phone: null, verified: false },
  };
  const text = (b: Uint8Array) => new TextDecoder("latin1").decode(b);
  it("un document valide d'une page", () => {
    const pdf = buildSimulationPdf({ ...base, lines: [{ label: "Glycémie", ok: true, billed: 1875, covered: 1500, ticket: 375 }], totals: { billed: 1875, covered: 1500, ticket: 375 } });
    const t = text(pdf);
    expect(t.startsWith("%PDF-1.4")).toBe(true);
    expect(t.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(t).toContain("/Count 1");
    expect(t).toContain("/DCTDecode");
  });
  it("passe sur plusieurs pages quand il y a beaucoup de lignes", () => {
    const lines = Array.from({ length: 40 }, (_, i) => ({ label: `Acte ${i + 1}`, ok: true, billed: 1000, covered: 800, ticket: 200 }));
    const pdf = buildSimulationPdf({ ...base, lines, totals: { billed: 40000, covered: 32000, ticket: 8000 } });
    expect(text(pdf)).toContain("/Count 2");
  });
});
