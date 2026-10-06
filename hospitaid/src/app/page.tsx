import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PartnerCard from "@/components/partner-card";
import { getActivePartners } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { compte?: string } }) {
  let facilitiesCount = 0, examsCount = 0, verifiedCount = 0;
  const partners = await getActivePartners(4);
  let dbError: string | null = null;
  try {
    [facilitiesCount, examsCount, verifiedCount] = await Promise.all([
      prisma.healthFacility.count(),
      prisma.exam.count(),
      prisma.exam.count({ where: { status: "VERIFIE" } }),
    ]);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "Erreur de connexion à la base de données.";
  }

  return (
    <main className="container">
      {searchParams.compte === "supprime" && (
        <div className="notice notice-blue" role="status">Votre compte et votre historique ont été supprimés.</div>
      )}
      <section className="hero">
        <h1>Connaissez vos examens. Comprenez votre ticket modérateur.</h1>
        <p>Choisissez vos examens, votre établissement et votre statut CNAMGS : voyez tout de suite ce qui reste à votre charge.</p>
        <Link href="/simulateur" className="btn btn-white">Calculer mon ticket modérateur →</Link>
      </section>

      <div className="tiles">
        <Link href="/simulateur" className="tile"><span className="ic">🧮</span>Simulateur</Link>
        <Link href="/etablissements" className="tile"><span className="ic">🏥</span>Établissements</Link>
        <Link href="/mon-compte" className="tile"><span className="ic">👤</span>Mon compte</Link>
      </div>

      <section className="card" id="statuts">
        <h2>Les statuts de prise en charge</h2>
        <p className="muted" style={{ margin: "0 0 10px" }}>La part remboursée par la CNAMGS dépend de votre situation.</p>
        <div className="stack">
          {[
            ["Exonéré", "Femme enceinte déclarée", "100 %"],
            ["Plein", "Affection courante", "80 %"],
            ["Plein — ALD", "Affection de longue durée", "90 %"],
            ["PAF", "Particulier à ses frais (non assuré)", "0 %"],
          ].map(([l, m, r]) => (
            <div key={l} className="option" style={{ cursor: "default" }}>
              <span>{l}<span className="meta">{m}</span></span>
              <span className="badge">{r}</span>
            </div>
          ))}
        </div>
      </section>

      {partners.length > 0 && (
        <section style={{ marginBottom: 12 }}>
          <h2 className="section-title">Nos partenaires</h2>
          <div className="stack">{partners.map((p) => <PartnerCard key={p.id} partner={p} />)}</div>
        </section>
      )}

      {dbError ? (
        <div className="notice">⚠️ Connexion à la base de données impossible : {dbError}</div>
      ) : (
        <section className="card">
          <h2>Dans la base aujourd&apos;hui</h2>
          <dl style={{ margin: "8px 0 0" }}>
            <div className="spec-row"><dt>Actes de la nomenclature</dt><dd>{examsCount}</dd></div>
            <div className="spec-row"><dt>dont vérifiés</dt><dd>{verifiedCount}</dd></div>
            <div className="spec-row"><dt>Établissements</dt><dd>{facilitiesCount}</dd></div>
          </dl>
        </section>
      )}

      <div className="notice notice-blue">
        Application en cours de validation : les tarifs et informations doivent être confirmés auprès
        de l&apos;établissement et de la CNAMGS. Ils ne remplacent ni un avis médical ni une confirmation
        administrative de prise en charge.
      </div>
    </main>
  );
}
