import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { markExamVerified, markFacilityVerified, addFacility } from "./actions";
import { logout } from "./login/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [examsToVerify, facilities, examCount, verifiedCount, types] = await Promise.all([
    prisma.exam.findMany({ where: { status: "A_VERIFIER" }, take: 30, orderBy: { officialName: "asc" } }),
    prisma.healthFacility.findMany({ orderBy: { name: "asc" } }),
    prisma.exam.count(),
    prisma.exam.count({ where: { status: "VERIFIE" } }),
    prisma.facilityType.findMany(),
  ]);

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <div className="row-between">
        <Link href="/" className="back-link">← Accueil</Link>
        <form action={logout}><button className="btn btn-outline btn-small">Se déconnecter</button></form>
      </div>
      <h1 className="page-title">Espace admin</h1>
      <p className="page-sub">{verifiedCount} / {examCount} actes marqués « Vérifié ».</p>

      <div className="stack" style={{ marginBottom: 12 }}>
        <Link href="/admin/examens" className="option">
          <span>Noms des examens<span className="meta">Noms plus usuels et mots-clés de recherche</span></span>
          <span className="badge">Modifier →</span>
        </Link>
        <Link href="/admin/prix" className="option">
          <span>Prix et marges<span className="meta">Marge de chaque établissement, ajustement d&apos;un prix</span></span>
          <span className="badge">Modifier →</span>
        </Link>
        <Link href="/admin/annonces" className="option">
          <span>Partenaires et annonces<span className="meta">Encarts publicitaires et bande défilante</span></span>
          <span className="badge">Modifier →</span>
        </Link>
        <Link href="/admin/utilisateurs" className="option">
          <span>Utilisateurs<span className="meta">Réinitialiser un mot de passe oublié</span></span>
          <span className="badge">Ouvrir →</span>
        </Link>
        <Link href="/admin/parametres" className="option">
          <span>Paramètres<span className="meta">Prestations non remboursées (AMI), coordonnées pour les PDF</span></span>
          <span className="badge">Ouvrir →</span>
        </Link>
      </div>

      <section className="card">
        <h2>Établissements</h2>
        <div className="stack" style={{ marginTop: 10 }}>
          {facilities.map((f) => (
            <div key={f.id} className="option" style={{ cursor: "default" }}>
              <span>{f.name}<span className="meta">{f.address ?? "Adresse à vérifier"}</span></span>
              {f.verifiedAt ? (
                <span className="badge badge-ok">Vérifié</span>
              ) : (
                <form action={markFacilityVerified.bind(null, f.id)}>
                  <button className="btn btn-outline btn-small">Marquer vérifié</button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Ajouter un établissement</h2>
        <form action={addFacility} className="stack" style={{ marginTop: 10 }}>
          <input className="input" name="name" placeholder="Nom de l'établissement" required />
          <select className="input" name="typeCode">
            {types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
          <select className="input" name="tier" defaultValue="">
            <option value="">— Niveau tarifaire (optionnel) —</option>
            <option value="CHU_PUBLIC">Centre hospitalier de référence (public)</option>
            <option value="HOPITAL_REGIONAL">Hôpital régional (public)</option>
            <option value="CENTRE_SANTE">Centre médical / centre de santé (public)</option>
            <option value="PRIVE_JOUR">Secteur privé</option>
            <option value="PRIVE_NUIT">Secteur privé (nuits, dimanches, fériés)</option>
          </select>
          <input className="input" name="city" placeholder="Ville" defaultValue="Libreville" />
          <input className="input" name="address" placeholder="Adresse" />
          <input className="input" name="phone" placeholder="Téléphone" />
          <button className="btn btn-primary btn-block">Ajouter l&apos;établissement</button>
        </form>
      </section>

      <section className="card">
        <h2>Actes à vérifier</h2>
        <p className="muted" style={{ margin: "2px 0 10px" }}>{examsToVerify.length} affichés (par ordre alphabétique).</p>
        <div className="stack">
          {examsToVerify.map((e) => (
            <div key={e.id} className="option" style={{ cursor: "default" }}>
              <span>{e.officialName}<span className="meta">{e.lettreCleCode} × {e.coefficient}</span></span>
              <form action={markExamVerified.bind(null, e.id)}>
                <button className="btn btn-outline btn-small">Vérifié</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
