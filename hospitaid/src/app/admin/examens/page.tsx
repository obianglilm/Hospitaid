import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getEffectiveConsultations } from "@/lib/consultation-names";
import { searchTokens } from "@/lib/names-core";
import { updateConsultationNames, updateExamNames } from "../actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function AdminExamsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const tokens = searchTokens(q);
  const where = tokens.length > 0 ? { AND: tokens.map((t) => ({ searchText: { contains: t } })) } : {};

  const [exams, total, consultations] = await Promise.all([
    prisma.exam.findMany({
      where,
      orderBy: { officialName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { nomenclatureCode: { select: { code: true } } },
    }),
    prisma.exam.count({ where }),
    getEffectiveConsultations(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/examens?q=${encodeURIComponent(q)}&page=${p}`;

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <Link href="/admin" className="back-link">← Espace admin</Link>
      <h1 className="page-title">Noms des examens</h1>
      <p className="page-sub">
        Donnez à chaque examen un nom que les patients reconnaissent, et ajoutez des mots-clés
        (séparés par des virgules). Le libellé officiel de la nomenclature n&apos;est jamais modifié : il reste
        affiché comme référence.
      </p>

      <section className="card">
        <h2>Consultations et prestations</h2>
        <div className="stack" style={{ marginTop: 10 }}>
          {consultations.map((c) => (
            <form key={c.code} action={updateConsultationNames} className="card" style={{ margin: 0, padding: 12 }}>
              <input type="hidden" name="code" value={c.code} />
              <div className="field">
                <label htmlFor={`label-${c.code}`}>Nom affiché</label>
                <input className="input" id={`label-${c.code}`} name="label" defaultValue={c.label} maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor={`syn-${c.code}`}>Mots-clés</label>
                <input className="input" id={`syn-${c.code}`} name="synonyms" defaultValue={c.synonyms.join(", ")} />
              </div>
              <button className="btn btn-outline btn-small">Enregistrer</button>
            </form>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Actes de la nomenclature</h2>
        <form method="get" className="stack" style={{ margin: "10px 0" }}>
          <input className="input" name="q" defaultValue={q} placeholder="Rechercher (nom, mot-clé, code)…" />
          <button className="btn btn-primary btn-block">Rechercher</button>
        </form>
        <p className="muted">{total} acte{total > 1 ? "s" : ""} · page {Math.min(page, pages)} / {pages}</p>

        <div className="stack">
          {exams.map((e) => (
            <form key={e.id} action={updateExamNames} className="card" style={{ margin: 0, padding: 12 }}>
              <input type="hidden" name="examId" value={e.id} />
              <p className="muted" style={{ margin: "0 0 8px" }}>
                <strong>Officiel :</strong> {e.officialName}
                <br />
                {e.nomenclatureCode?.code ?? "—"} · {e.lettreCleCode} × {e.coefficient}
                {e.namesEditedAt && <span className="badge" style={{ marginLeft: 6 }}>modifié</span>}
              </p>
              <div className="field">
                <label htmlFor={`dn-${e.id}`}>Nom usuel</label>
                <input className="input" id={`dn-${e.id}`} name="displayName" defaultValue={e.displayName ?? ""} placeholder="Laisser vide = libellé officiel" maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor={`sy-${e.id}`}>Mots-clés</label>
                <input className="input" id={`sy-${e.id}`} name="synonyms" defaultValue={e.synonyms.join(", ")} />
              </div>
              <button className="btn btn-outline btn-small">Enregistrer</button>
            </form>
          ))}
          {exams.length === 0 && <p className="muted">Aucun acte ne correspond.</p>}
        </div>

        <div className="row-between" style={{ marginTop: 12 }}>
          {page > 1 ? <Link className="btn btn-outline btn-small" href={link(page - 1)}>← Précédent</Link> : <span />}
          {page < pages ? <Link className="btn btn-outline btn-small" href={link(page + 1)}>Suivant →</Link> : <span />}
        </div>
      </section>
    </main>
  );
}
