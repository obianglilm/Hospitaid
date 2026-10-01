import { describe, it, expect } from "vitest";
import {
  calculateTicketModerateur,
  computeReferenceFromLettreCle,
  priceLine,
  DEFAULT_COVERAGE_RATES,
  PricingError,
} from "@/lib/pricing-core";

const calc = (ref: number, billed: number, rate: number) =>
  calculateTicketModerateur({ referenceAmount: ref, facilityBilledAmount: billed, coverageRatePercent: rate });

describe("secteur public (facturé = conventionné) — valeurs de l'Annexe 2", () => {
  it("consultation généraliste, centre de référence : 7 500 → 1 500 / 750 / 0 / 7 500", () => {
    expect(calc(7500, 7500, 80).ticketModerateur).toBe(1500);
    expect(calc(7500, 7500, 90).ticketModerateur).toBe(750);
    expect(calc(7500, 7500, 100).ticketModerateur).toBe(0);
    expect(calc(7500, 7500, 0).ticketModerateur).toBe(7500);
  });
  it("infirmier, hôpital régional : 2 625 → pris en charge 2 363 et ticket 263 (arrondis du document)", () => {
    const r = calc(2625, 2625, 90);
    expect(r.amountCoveredByCnamgs).toBe(2363);
    expect(r.ticketModerateur).toBe(263);
  });
  it("sage-femme, centre de santé : 2 520 → 2 016 / 504 (80 %) et 2 268 / 252 (90 %)", () => {
    expect(calc(2520, 2520, 80)).toEqual({ amountCoveredByCnamgs: 2016, ticketModerateur: 504 });
    expect(calc(2520, 2520, 90)).toEqual({ amountCoveredByCnamgs: 2268, ticketModerateur: 252 });
  });
});

describe("secteur privé — dépassement à la charge du patient (Annexe 3)", () => {
  it("généraliste : facturé 15 000, conventionné 7 500 → 9 000 / 8 250 / 7 500", () => {
    expect(calc(7500, 15000, 80).ticketModerateur).toBe(9000);
    expect(calc(7500, 15000, 90).ticketModerateur).toBe(8250);
    expect(calc(7500, 15000, 100).ticketModerateur).toBe(7500);
  });
  it("psychiatre : facturé 25 000, conventionné 12 000 → 15 400 / 14 200 / 13 000", () => {
    expect(calc(12000, 25000, 80).ticketModerateur).toBe(15400);
    expect(calc(12000, 25000, 90).ticketModerateur).toBe(14200);
    expect(calc(12000, 25000, 100).ticketModerateur).toBe(13000);
  });
  it("chirurgien-dentiste de nuit : facturé 11 100 → 5 100 / 4 350 / 3 600", () => {
    expect(calc(7500, 11100, 80).ticketModerateur).toBe(5100);
    expect(calc(7500, 11100, 90).ticketModerateur).toBe(4350);
    expect(calc(7500, 11100, 100).ticketModerateur).toBe(3600);
  });
  it("journée d'hospitalisation privée : 20 000 → 4 000 / 2 000 / 0", () => {
    expect(calc(20000, 20000, 80).ticketModerateur).toBe(4000);
    expect(calc(20000, 20000, 90).ticketModerateur).toBe(2000);
    expect(calc(20000, 20000, 100).ticketModerateur).toBe(0);
  });
});

describe("actes techniques (lettre-clé × coefficient)", () => {
  it("NFS : B (125) × 60 = 7 500", () => expect(computeReferenceFromLettreCle(60, 125)).toBe(7500));
  it("glucose : B (125) × 15 = 1 875 ; ticket à 80 % = 375", () => {
    const ref = computeReferenceFromLettreCle(15, 125);
    expect(ref).toBe(1875);
    expect(calc(ref, ref, 80).ticketModerateur).toBe(375);
  });
  it("échographie abdominale : KE (1 200) × 30 = 36 000", () =>
    expect(computeReferenceFromLettreCle(30, 1200)).toBe(36000));
  it("refuse une valeur de lettre-clé nulle (Rd/Rt non renseignées)", () => {
    expect(() => computeReferenceFromLettreCle(15, 0)).toThrow(PricingError);
  });
});

describe("priceLine", () => {
  it("forfait accouchement : couvert seulement pour EXONERE ; PAF paie tout", () => {
    const base = { referenceAmount: 60000, billedAmount: 60000, rates: DEFAULT_COVERAGE_RATES, coveredStatuses: ["EXONERE"] };
    const exo = priceLine({ ...base, status: "EXONERE" });
    expect(exo.ok && exo.ticket).toBe(0);
    expect(priceLine({ ...base, status: "PLEIN" }).ok).toBe(false);
    const paf = priceLine({ ...base, status: "PAF" });
    expect(paf.ok && paf.ticket).toBe(60000);
  });
  it("taux invalide refusé", () => {
    expect(() => calc(1000, 1000, 150)).toThrow(PricingError);
  });
});
