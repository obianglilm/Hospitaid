import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({ params }: { params: { id: string } }) {
  const exam = await prisma.exam.findUnique({
    where: { id: params.id },
    include: { lettreCle: true, nomenclatureCode: true },
  });
  if (!exam) return notFound();

  return (
    <main className="container">
      <Link href="/simulateur" className="back-link">← Simulateur</Link>
      <h1 className="page-title" style={{ fontSize: 21 }}>{exam.displayName ?? exam.officialName}</h1>
      {exam.displayName && <p className="muted">Libellé officiel : {exam.officialName}</p>}
      <div style={{ margin: "6px 0 12px" }}>
        <span className={`badge ${exam.status === "VERIFIE" ? "badge-ok" : "badge-warn"}`}>
          {exam.status === "VERIFIE" ? "Vérifié" : "À vérifier"}
        </span>
      </div>
      <section className="card">
        <dl style={{ margin: 0 }}>
          <div className="spec-row"><dt>Code nomenclature</dt><dd>{exam.nomenclatureCode?.code ?? "—"}</dd></div>
          <div className="spec-row"><dt>Chapitre</dt><dd>{exam.actType ?? "—"}</dd></div>
          <div className="spec-row"><dt>Lettre-clé</dt><dd>{exam.lettreCleCode ?? "—"}</dd></div>
          <div className="spec-row"><dt>Coefficient</dt><dd>{exam.coefficient ?? "—"}</dd></div>
          <div className="spec-row"><dt>Valeur de la lettre-clé</dt>
            <dd>{exam.lettreCle?.nationalValue ? `${exam.lettreCle.nationalValue} FCFA` : "Non renseignée"}</dd></div>
        </dl>
      </section>
      {exam.synonyms.length > 0 && <p className="muted">Aussi recherché sous : {exam.synonyms.join(", ")}</p>}
      <div className="notice">La disponibilité et le tarif de cet acte doivent être confirmés auprès de l&apos;établissement.</div>
    </main>
  );
}
