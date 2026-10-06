import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEffectiveConsultations } from "@/lib/consultation-names";
import { getCoverageExclusions, getSiteInfo } from "@/lib/settings";
import { saveExclusions, saveSiteInfo } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const [letters, consultations, exclusions, site] = await Promise.all([
    prisma.lettreCle.findMany({ orderBy: { code: "asc" } }),
    getEffectiveConsultations(),
    getCoverageExclusions(),
    getSiteInfo(),
  ]);

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <Link href="/admin" className="back-link">← Espace admin</Link>
      <h1 className="page-title">Paramètres</h1>
      {searchParams.saved && <div className="notice notice-blue" role="status">Paramètres enregistrés.</div>}

      <section className="card">
        <h2>Prestations non prises en charge par la CNAMGS</h2>
        <p className="muted" style={{ margin: "4px 0 10px" }}>
          Cochez ce qui n&apos;est jamais remboursé : le patient paie alors la totalité, quel que soit son statut.
          Par défaut : les soins infirmiers (lettre-clé AMI) et la visite d&apos;infirmier.
        </p>
        <form action={saveExclusions} className="stack">
          <strong style={{ fontSize: 13 }}>Actes techniques (par lettre-clé)</strong>
          {letters.map((l) => (
            <label key={l.code} className="checkbox-row">
              <input type="checkbox" name="letter" value={l.code} defaultChecked={exclusions.letterCodes.includes(l.code)} />
              <span><strong>{l.code}</strong> — {l.label}</span>
            </label>
          ))}
          <strong style={{ fontSize: 13, marginTop: 8 }}>Consultations et prestations</strong>
          {consultations.map((c) => (
            <label key={c.code} className="checkbox-row">
              <input type="checkbox" name="consult" value={c.code} defaultChecked={exclusions.consultationCodes.includes(c.code)} />
              <span>{c.label}</span>
            </label>
          ))}
          <button className="btn btn-primary btn-block">Enregistrer</button>
        </form>
      </section>

      <section className="card">
        <h2>Coordonnées de HospitAid (en-tête des PDF)</h2>
        <form action={saveSiteInfo} className="stack" style={{ marginTop: 10 }}>
          <div className="field"><label htmlFor="website">Site web</label><input className="input" id="website" name="website" defaultValue={site.website} /></div>
          <div className="field"><label htmlFor="email">E-mail de contact</label><input className="input" id="email" name="email" defaultValue={site.email} /></div>
          <div className="field"><label htmlFor="phone">Téléphone</label><input className="input" id="phone" name="phone" defaultValue={site.phone} /></div>
          <div className="field"><label htmlFor="address">Adresse</label><input className="input" id="address" name="address" defaultValue={site.address} /></div>
          <button className="btn btn-primary btn-block">Enregistrer</button>
        </form>
      </section>
    </main>
  );
}
