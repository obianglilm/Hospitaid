import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEffectiveConsultations } from "@/lib/consultation-names";
import { searchTokens } from "@/lib/names-core";
import { computeReferenceFromLettreCle, formatFcfa } from "@/lib/pricing-core";
import { deletePriceOverride, savePriceOverride, updateFacilityMargin } from "../actions";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  margin: "Marge enregistrée.",
  override: "Ajustement enregistré.",
};
const ERRORS: Record<string, string> = {
  margin: "Marge invalide (nombre entre 0 et 300).",
  amount: "Montant invalide (nombre entier de FCFA, sans lettres).",
  target: "Prestation introuvable.",
  scope: "Établissement introuvable.",
};

export default async function AdminPricesPage({ searchParams }: { searchParams: { q?: string; saved?: string; error?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const tokens = searchTokens(q);

  const [facilities, overrides, consultations, matches] = await Promise.all([
    prisma.healthFacility.findMany({ orderBy: { name: "asc" } }),
    prisma.priceOverride.findMany({ orderBy: { updatedAt: "desc" }, take: 100 }),
    getEffectiveConsultations(),
    tokens.length > 0
      ? prisma.exam.findMany({
          where: { AND: tokens.map((t) => ({ searchText: { contains: t } })) },
          include: { lettreCle: true },
          orderBy: { officialName: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const examIds = overrides.filter((o) => o.kind === "EXAM").map((o) => o.targetKey);
  const examNames = examIds.length > 0
    ? await prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, officialName: true, displayName: true } })
    : [];
  const nameOf = (kind: string, key: string): string =>
    kind === "CONSULTATION"
      ? consultations.find((c) => c.code === key)?.label ?? key
      : (() => { const e = examNames.find((x) => x.id === key); return e ? e.displayName ?? e.officialName : key; })();
  const scopeName = (scope: string) => (scope === "ALL" ? "Tous les établissements" : facilities.find((f) => f.id === scope)?.name ?? "Établissement supprimé");

  const consultationMatches = tokens.length > 0
    ? consultations.filter((c) => {
        const hay = searchTokens([c.label, ...c.synonyms].join(" "), 50);
        return tokens.every((t) => hay.some((h) => h.includes(t)));
      })
    : [];

  const scopeSelect = (
    <select className="input" name="scope" defaultValue="ALL">
      <option value="ALL">Tous les établissements</option>
      {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
  const amountFields = (
    <>
      <div className="field">
        <label>Tarif conventionné (base CNAMGS) — vide = inchangé</label>
        <input className="input" name="referenceAmount" inputMode="numeric" placeholder="FCFA" />
      </div>
      <div className="field">
        <label>Prix facturé par l&apos;établissement — vide = tarif + marge</label>
        <input className="input" name="billedAmount" inputMode="numeric" placeholder="FCFA" />
      </div>
    </>
  );

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <Link href="/admin" className="back-link">← Espace admin</Link>
      <h1 className="page-title">Prix et marges</h1>
      <p className="page-sub">
        La nomenclature fixe le tarif conventionné, identique partout (base de remboursement CNAMGS). Chaque
        établissement peut facturer un peu plus : définissez ici sa <strong>marge</strong>, ou fixez un prix précis
        pour une prestation. La part prise en charge par la CNAMGS ne change pas : tout supplément reste à la charge du patient.
      </p>
      {searchParams.saved && <div className="notice notice-blue" role="status">{MESSAGES[searchParams.saved] ?? "Enregistré."}</div>}
      {searchParams.error && <div className="notice" role="alert">{ERRORS[searchParams.error] ?? "Erreur."}</div>}

      <section className="card">
        <h2>Marge par établissement</h2>
        <p className="muted" style={{ margin: "4px 0 10px" }}>Majoration en % du prix facturé, pour toutes les prestations de l&apos;établissement (0 = aucune).</p>
        <div className="stack">
          {facilities.map((f) => (
            <form key={f.id} action={updateFacilityMargin} className="option" style={{ cursor: "default" }}>
              <input type="hidden" name="facilityId" value={f.id} />
              <span style={{ flex: 1 }}>{f.name}</span>
              <input className="input" style={{ width: 78 }} name="marginPercent" inputMode="decimal" defaultValue={f.marginPercent} aria-label={`Marge de ${f.name} en pourcentage`} />
              <span>%</span>
              <button className="btn btn-outline btn-small">OK</button>
            </form>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Ajuster le prix d&apos;une prestation</h2>
        <form method="get" className="stack" style={{ margin: "10px 0" }}>
          <input className="input" name="q" defaultValue={q} placeholder="Rechercher un examen ou une prestation…" />
          <button className="btn btn-primary btn-block">Rechercher</button>
        </form>

        <div className="stack">
          {consultationMatches.map((c) => (
            <form key={c.code} action={savePriceOverride} className="card" style={{ margin: 0, padding: 12 }}>
              <input type="hidden" name="kind" value="CONSULTATION" />
              <input type="hidden" name="targetKey" value={c.code} />
              <p style={{ margin: "0 0 8px" }}><strong>{c.label}</strong><br /><span className="muted">Tarifs du barème selon le niveau de l&apos;établissement</span></p>
              <div className="field"><label>Établissement concerné</label>{scopeSelect}</div>
              {amountFields}
              <button className="btn btn-outline btn-small" style={{ marginTop: 8 }}>Enregistrer l&apos;ajustement</button>
            </form>
          ))}
          {matches.map((e) => {
            let current = "non calculable : renseignez le tarif conventionné";
            if (e.lettreCle?.nationalValue && e.coefficient) {
              current = `${e.lettreCleCode} × ${e.coefficient} = ${formatFcfa(computeReferenceFromLettreCle(e.coefficient, e.lettreCle.nationalValue))}`;
            }
            return (
              <form key={e.id} action={savePriceOverride} className="card" style={{ margin: 0, padding: 12 }}>
                <input type="hidden" name="kind" value="EXAM" />
                <input type="hidden" name="targetKey" value={e.id} />
                <p style={{ margin: "0 0 8px" }}><strong>{e.displayName ?? e.officialName}</strong><br /><span className="muted">Tarif de la nomenclature : {current}</span></p>
                <div className="field"><label>Établissement concerné</label>{scopeSelect}</div>
                {amountFields}
                <button className="btn btn-outline btn-small" style={{ marginTop: 8 }}>Enregistrer l&apos;ajustement</button>
              </form>
            );
          })}
          {tokens.length > 0 && matches.length === 0 && consultationMatches.length === 0 && <p className="muted">Aucun résultat.</p>}
        </div>
      </section>

      <section className="card">
        <h2>Ajustements en vigueur ({overrides.length})</h2>
        <div className="stack" style={{ marginTop: 10 }}>
          {overrides.map((o) => (
            <div key={o.id} className="option" style={{ cursor: "default", alignItems: "flex-start" }}>
              <span>
                {nameOf(o.kind, o.targetKey)}
                <span className="meta">
                  {scopeName(o.scope)} · conventionné : {o.referenceAmount !== null ? formatFcfa(o.referenceAmount) : "inchangé"} · facturé : {o.billedAmount !== null ? formatFcfa(o.billedAmount) : "tarif + marge"}
                </span>
              </span>
              <form action={deletePriceOverride.bind(null, o.id)}><button className="btn btn-outline btn-small">Retirer</button></form>
            </div>
          ))}
          {overrides.length === 0 && <p className="muted">Aucun ajustement : les prix suivent la nomenclature et les marges ci-dessus.</p>}
        </div>
      </section>
    </main>
  );
}
