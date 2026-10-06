// Mise en page du PDF « Simulation de ticket modérateur ».
import { PdfDocument, PdfPage, textWidth, wrapText, type RGB } from "./pdf-writer";
import { formatFcfa } from "./pricing-core";
import { LOGO_JPEG_BASE64 } from "./logo-data";

export interface ReportLine {
  label: string;
  ok: boolean;
  reason?: string;
  notCovered?: boolean;
  billed?: number;
  covered?: number;
  ticket?: number;
}

export interface ReportData {
  generatedAt: Date;
  site: { name: string; tagline: string; website: string; contactLines: string[] };
  patient: { name: string | null; username: string | null; coverageLabel: string; coverageRate: number };
  facility: { name: string; typeLabel: string | null; city: string; address: string | null; phone: string | null; verified: boolean };
  lines: ReportLine[];
  totals: { billed: number; covered: number; ticket: number };
  extraNotes?: string[];
}

const BLUE: RGB = [0.02, 0.467, 0.745];
const BLUE_DEEP: RGB = [0.016, 0.341, 0.561];
const RED: RGB = [0.88, 0.27, 0.28];
const RED_DEEP: RGB = [0.76, 0.157, 0.165];
const INK: RGB = [0.086, 0.125, 0.169];
const GRAY: RGB = [0.357, 0.4, 0.447];
const LIGHT: RGB = [0.965, 0.972, 0.98];
const BORDER: RGB = [0.82, 0.85, 0.88];

const W = 595.28;
const H = 841.89;
const M = 40;
const CONTENT_W = W - 2 * M;
const BOTTOM = 62;

// Colonnes du tableau : prestation | facturé | pris en charge | à charge
const COL_LABEL_W = 245;
const COL_RIGHT = [M + COL_LABEL_W + 90, M + COL_LABEL_W + 180, M + CONTENT_W] as const;

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function formatDateTime(d: Date): string {
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Libreville" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Libreville" }).format(d);
  return `${date} à ${time}`;
}

function topBand(page: PdfPage): void {
  page.rect(0, H - 6, W * 0.38, 6, { fill: BLUE });
  page.rect(W * 0.62, H - 6, W * 0.38, 6, { fill: RED });
}

function tableHeader(page: PdfPage, y: number): number {
  page.rect(M, y - 20, CONTENT_W, 20, { fill: BLUE_DEEP });
  const o = { font: "F2" as const, size: 8.5, color: [1, 1, 1] as RGB };
  page.text(M + 6, y - 13.5, "Prestation", o);
  page.textRight(COL_RIGHT[0] - 6, y - 13.5, "Tarif facturé", o);
  page.textRight(COL_RIGHT[1] - 6, y - 13.5, "Pris en charge", o);
  page.textRight(COL_RIGHT[2] - 6, y - 13.5, "À votre charge", o);
  return y - 20;
}

export function buildSimulationPdf(data: ReportData): Uint8Array {
  const doc = new PdfDocument(W, H, "HospitAid - Simulation de ticket moderateur");
  doc.addJpeg("Logo", decodeBase64(LOGO_JPEG_BASE64));

  let page = doc.addPage();
  topBand(page);

  // En-tête : logo, nom, coordonnées du service, titre du document.
  page.image("Logo", M, H - 24 - 58, 58, 58);
  page.text(M + 70, H - 46, data.site.name, { font: "F2", size: 22, color: BLUE_DEEP });
  page.text(M + 70, H - 60, data.site.tagline, { font: "F3", size: 9.5, color: GRAY });
  page.text(M + 70, H - 73, data.site.website, { font: "F1", size: 9, color: BLUE });
  const right = M + CONTENT_W;
  page.textRight(right, H - 38, "Simulation de ticket modérateur", { font: "F2", size: 12, color: INK });
  page.textRight(right, H - 52, `Établie le ${formatDateTime(data.generatedAt)}`, { size: 9, color: GRAY });
  let contactY = H - 64;
  for (const c of data.site.contactLines.slice(0, 3)) {
    page.textRight(right, contactY, c, { size: 9, color: GRAY });
    contactY -= 11;
  }
  page.line(M, H - 92, right, H - 92, { width: 1, color: BORDER });

  // Encadrés Patient / Établissement.
  const boxTop = H - 104;
  const boxW = (CONTENT_W - 12) / 2;
  const patientLines = [
    data.patient.name ? data.patient.name : "Patient non renseigné",
    ...(data.patient.username ? [`Identifiant : ${data.patient.username}`] : []),
    `Statut CNAMGS : ${data.patient.coverageLabel} (${data.patient.coverageRate} % pris en charge)`,
  ];
  const facilityLines = [
    data.facility.name,
    ...(data.facility.typeLabel ? [data.facility.typeLabel] : []),
    data.facility.address ? `${data.facility.address}, ${data.facility.city}` : data.facility.city,
    ...(data.facility.phone ? [`Tél. : ${data.facility.phone}`] : []),
  ];
  const wrap = (lines: string[], font: "F1" | "F2") =>
    lines.flatMap((l, idx) => wrapText(l, idx === 0 ? "F2" : font, idx === 0 ? 10.5 : 9.5, boxW - 20));
  const pw = wrap(patientLines, "F1");
  const fw = wrap(facilityLines, "F1");
  const boxH = 24 + Math.max(pw.length, fw.length) * 12.5;
  const drawBox = (x: number, title: string, lines: string[]) => {
    page.rect(x, boxTop - boxH, boxW, boxH, { fill: LIGHT, stroke: BORDER });
    page.text(x + 10, boxTop - 15, title, { font: "F2", size: 8, color: GRAY });
    lines.forEach((l, idx) => page.text(x + 10, boxTop - 30 - idx * 12.5, l, { font: idx === 0 ? "F2" : "F1", size: idx === 0 ? 10.5 : 9.5, color: INK }));
  };
  drawBox(M, "PATIENT", pw);
  drawBox(M + boxW + 12, "ÉTABLISSEMENT (LIEU DES PRESTATIONS)", fw);

  // Tableau des prestations.
  let y = tableHeader(page, boxTop - boxH - 22);
  let zebra = false;
  for (const line of data.lines) {
    const labelLines = wrapText(line.label, "F1", 9.5, COL_LABEL_W - 12);
    const subLines: { text: string; color: RGB }[] = [];
    if (!line.ok && line.reason) wrapText(line.reason, "F3", 8, COL_LABEL_W - 12).forEach((t) => subLines.push({ text: t, color: RED_DEEP }));
    if (line.ok && line.notCovered) subLines.push({ text: "Non pris en charge par la CNAMGS", color: RED_DEEP });
    const rowH = 8 + labelLines.length * 12 + subLines.length * 10;

    if (y - rowH < BOTTOM + 150) {
      page = doc.addPage();
      topBand(page);
      page.text(M, H - 30, `${data.site.name} — suite de la simulation`, { font: "F2", size: 10, color: BLUE_DEEP });
      y = tableHeader(page, H - 44);
      zebra = false;
    }
    if (zebra) page.rect(M, y - rowH, CONTENT_W, rowH, { fill: LIGHT });
    zebra = !zebra;
    let ty = y - 14;
    for (const t of labelLines) { page.text(M + 6, ty, t, { size: 9.5, color: INK }); ty -= 12; }
    for (const s of subLines) { page.text(M + 6, ty + 1, s.text, { font: "F3", size: 8, color: s.color }); ty -= 10; }
    if (line.ok) {
      const o = { size: 9.5, color: INK };
      page.textRight(COL_RIGHT[0] - 6, y - 14, formatFcfa(line.billed ?? 0), o);
      page.textRight(COL_RIGHT[1] - 6, y - 14, formatFcfa(line.covered ?? 0), o);
      page.textRight(COL_RIGHT[2] - 6, y - 14, formatFcfa(line.ticket ?? 0), { font: "F2", size: 9.5, color: INK });
    } else {
      for (const x of COL_RIGHT) page.textRight(x - 6, y - 14, "—", { size: 9.5, color: GRAY });
    }
    y -= rowH;
    page.line(M, y, M + CONTENT_W, y, { width: 0.4, color: BORDER });
  }

  // Totaux.
  y -= 18;
  const totalX = COL_RIGHT[2];
  page.text(M + 6, y, "Total facturé", { size: 10, color: GRAY });
  page.textRight(totalX - 6, y, formatFcfa(data.totals.billed), { size: 10, color: INK });
  y -= 16;
  page.text(M + 6, y, "Total pris en charge par la CNAMGS", { size: 10, color: GRAY });
  page.textRight(totalX - 6, y, `− ${formatFcfa(data.totals.covered)}`, { size: 10, color: INK });
  y -= 10;
  page.line(M, y, M + CONTENT_W, y, { width: 1.2, color: INK });
  y -= 22;
  page.text(M + 6, y, "TOTAL À VOTRE CHARGE", { font: "F2", size: 12, color: INK });
  page.textRight(totalX - 6, y, formatFcfa(data.totals.ticket), { font: "F2", size: 16, color: RED_DEEP });

  // Notes.
  y -= 30;
  const notes = [
    "Ce document est une estimation indicative établie à partir de la nomenclature des actes des professions de santé (Gabon, décembre 2010). Il n'a valeur ni de facture, ni de confirmation de prise en charge.",
    "La disponibilité des examens et les tarifs doivent être confirmés auprès de l'établissement et de la CNAMGS.",
    ...(data.facility.verified ? [] : ["Les coordonnées de cet établissement n'ont pas encore été vérifiées."]),
    ...(data.extraNotes ?? []),
  ];
  const noteLines = notes.flatMap((n) => wrapText(`• ${n}`, "F1", 8.5, CONTENT_W - 8));
  if (y - noteLines.length * 11 - 20 < BOTTOM) {
    page = doc.addPage();
    topBand(page);
    y = H - 50;
  }
  page.text(M, y, "À savoir", { font: "F2", size: 9, color: INK });
  y -= 13;
  for (const t of noteLines) { page.text(M + 4, y, t, { size: 8.5, color: GRAY }); y -= 11; }

  // Pied de page sur chaque page.
  const n = doc.pages.length;
  doc.pages.forEach((p, i) => {
    p.line(M, 46, M + CONTENT_W, 46, { width: 0.5, color: BORDER });
    p.text(M, 33, `Document indicatif généré par ${data.site.name} — ${data.site.website}`, { size: 8, color: GRAY });
    p.textRight(M + CONTENT_W, 33, `Page ${i + 1} / ${n}`, { size: 8, color: GRAY });
  });

  return doc.build();
}

export { textWidth };
