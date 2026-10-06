// Générateur de PDF minimal, sans dépendance : texte (polices standard Helvetica),
// traits, rectangles et images JPEG. Suffisant pour des documents simples et fiable,
// car entièrement vérifiable (voir les tests).
import { HELVETICA_WIDTHS } from "./pdf-metrics";

export type FontKey = "F1" | "F2" | "F3"; // Helvetica, Helvetica-Bold, Helvetica-Oblique
export type RGB = [number, number, number]; // composantes de 0 à 1

const CP1252_EXTRA: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

/** Texte Unicode → octets WinAnsi (cp1252). Les caractères inconnus deviennent « ? ». */
export function toWinAnsi(text: string): number[] {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 63;
    if (cp === 0x202f || cp === 0xa0) out.push(0xa0);
    else if (cp >= 32 && cp < 127) out.push(cp);
    else if (cp >= 0xa1 && cp <= 0xff) out.push(cp);
    else if (CP1252_EXTRA[cp] !== undefined) out.push(CP1252_EXTRA[cp] as number);
    else if (cp === 0x2212) out.push(0x2d); // signe moins → trait d'union
    else if (cp === 9 || cp === 10 || cp === 13) out.push(32);
    else out.push(63);
  }
  return out;
}

export function textWidth(text: string, font: FontKey, size: number): number {
  const table = HELVETICA_WIDTHS[font] ?? [];
  let total = 0;
  for (const b of toWinAnsi(text)) total += table[b - 32] ?? 556;
  return (total / 1000) * size;
}

/** Découpe un texte en lignes qui tiennent dans maxWidth (coupe les mots trop longs). */
export function wrapText(text: string, font: FontKey, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter((w) => w.length > 0)) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, font, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = "";
      let rest = word;
      while (textWidth(rest, font, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    lines.push(current);
  }
  return lines;
}

const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
const num = (n: number) => (Math.round(n * 100) / 100).toString();
const color = (c: RGB) => `${num(c[0])} ${num(c[1])} ${num(c[2])}`;

export class PdfPage {
  readonly ops: string[] = [];
  readonly images = new Set<string>();

  text(x: number, y: number, str: string, o: { font?: FontKey; size?: number; color?: RGB } = {}): void {
    const font = o.font ?? "F1";
    const size = o.size ?? 10;
    this.ops.push(`BT /${font} ${num(size)} Tf ${color(o.color ?? [0, 0, 0])} rg ${num(x)} ${num(y)} Td <${hex(toWinAnsi(str))}> Tj ET`);
  }

  textRight(xRight: number, y: number, str: string, o: { font?: FontKey; size?: number; color?: RGB } = {}): void {
    this.text(xRight - textWidth(str, o.font ?? "F1", o.size ?? 10), y, str, o);
  }

  line(x1: number, y1: number, x2: number, y2: number, o: { width?: number; color?: RGB } = {}): void {
    this.ops.push(`${color(o.color ?? [0, 0, 0])} RG ${num(o.width ?? 0.5)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`);
  }

  rect(x: number, y: number, w: number, h: number, o: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {}): void {
    const parts: string[] = [];
    if (o.fill) parts.push(`${color(o.fill)} rg`);
    if (o.stroke) parts.push(`${color(o.stroke)} RG ${num(o.lineWidth ?? 0.5)} w`);
    parts.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re`);
    parts.push(o.fill && o.stroke ? "B" : o.fill ? "f" : "S");
    this.ops.push(parts.join(" "));
  }

  image(name: string, x: number, y: number, w: number, h: number): void {
    this.images.add(name);
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /${name} Do Q`);
  }
}

interface JpegImage { name: string; bytes: Uint8Array; width: number; height: number; components: number }

export function readJpegInfo(bytes: Uint8Array): { width: number; height: number; components: number } {
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1] ?? 0;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = ((bytes[i + 5] ?? 0) << 8) | (bytes[i + 6] ?? 0);
      const width = ((bytes[i + 7] ?? 0) << 8) | (bytes[i + 8] ?? 0);
      return { width, height, components: bytes[i + 9] ?? 0 };
    }
    i += 2 + (((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0));
  }
  throw new Error("JPEG illisible");
}

export class PdfDocument {
  readonly pages: PdfPage[] = [];
  private readonly jpegs: JpegImage[] = [];
  readonly width: number;
  readonly height: number;
  private readonly title: string;

  constructor(width = 595.28, height = 841.89, title = "HospitAid") {
    this.width = width;
    this.height = height;
    this.title = title;
  }

  addPage(): PdfPage {
    const p = new PdfPage();
    this.pages.push(p);
    return p;
  }

  addJpeg(name: string, bytes: Uint8Array): void {
    const info = readJpegInfo(bytes);
    if (info.components !== 1 && info.components !== 3) throw new Error("JPEG CMJN non géré");
    this.jpegs.push({ name, bytes, ...info });
  }

  build(): Uint8Array {
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let length = 0;
    const push = (data: string | Uint8Array) => {
      const b = typeof data === "string" ? enc.encode(data) : data;
      chunks.push(b);
      length += b.length;
    };
    const beginObject = (id: number) => {
      offsets[id] = length;
      push(`${id} 0 obj\n`);
    };

    // Numérotation : 1 catalogue, 2 pages, 3-5 polices, 6 info, puis images, puis (page, contenu) par page.
    const imageBase = 7;
    const pageBase = imageBase + this.jpegs.length;
    const pageId = (i: number) => pageBase + i * 2;
    const total = pageBase + this.pages.length * 2;

    push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
    beginObject(1);
    push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
    beginObject(2);
    push(`<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] >>\nendobj\n`);
    const fontNames = ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique"];
    fontNames.forEach((name, i) => {
      beginObject(3 + i);
      push(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} /Encoding /WinAnsiEncoding >>\nendobj\n`);
    });
    beginObject(6);
    push(`<< /Title (${this.title.replace(/[()\\]/g, "")}) /Producer (HospitAid) >>\nendobj\n`);

    this.jpegs.forEach((img, i) => {
      beginObject(imageBase + i);
      push(
        `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace ${img.components === 1 ? "/DeviceGray" : "/DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`
      );
      push(img.bytes);
      push("\nendstream\nendobj\n");
    });

    this.pages.forEach((page, i) => {
      const xobjects = [...page.images]
        .map((n) => {
          const idx = this.jpegs.findIndex((j) => j.name === n);
          return idx >= 0 ? `/${n} ${imageBase + idx} 0 R` : "";
        })
        .join(" ");
      beginObject(pageId(i));
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(this.width)} ${num(this.height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>${xobjects ? ` /XObject << ${xobjects} >>` : ""} >> /Contents ${pageId(i) + 1} 0 R >>\nendobj\n`
      );
      const content = enc.encode(page.ops.join("\n"));
      beginObject(pageId(i) + 1);
      push(`<< /Length ${content.length} >>\nstream\n`);
      push(content);
      push("\nendstream\nendobj\n");
    });

    const xrefOffset = length;
    push(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let id = 1; id < total; id++) push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const out = new Uint8Array(length);
    let pos = 0;
    for (const c of chunks) { out.set(c, pos); pos += c.length; }
    return out;
  }
}
