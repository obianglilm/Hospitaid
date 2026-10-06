import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { COVERAGE_LABELS, formatFcfa, type CoverageType } from "@/lib/pricing-core";
import { summarizeLines } from "@/lib/account-core";
import { changePassword, clearHistory, deleteAccount, logout, updateProfile } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Libreville" });

export default async function MonComptePage({ searchParams }: { searchParams: { saved?: string; cleared?: string; error?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/mon-compte");

  const history = await prisma.simulationRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const coverageKeys = Object.keys(COVERAGE_LABELS) as CoverageType[];

  return (
    <main className="container">
      <h1 className="page-title">Bonjour{user.fullName ? ` ${user.fullName}` : ""}</h1>
      <p className="page-sub">Identifiant : <strong>{user.username ?? user.email}</strong></p>

      {searchParams.saved === "pw" && <div className="notice notice-blue" role="status">Mot de passe modifié.</div>}
      {searchParams.saved && searchParams.saved !== "pw" && <div className="notice notice-blue" role="status">Profil enregistré.</div>}
      {searchParams.error === "pwwrong" && <div className="notice" role="alert">Le mot de passe actuel est incorrect.</div>}
      {searchParams.error === "pwweak" && <div className="notice" role="alert">Nouveau mot de passe refusé : 6 caractères minimum, pas trop courant.</div>}
      {searchParams.cleared && <div className="notice notice-blue" role="status">Historique supprimé.</div>}
      {searchParams.error === "confirm" && <div className="notice" role="alert">Tapez SUPPRIMER pour confirmer la suppression du compte.</div>}
      {searchParams.error === "delete" && <div className="notice" role="alert">La suppression a échoué. Contactez-nous pour la finaliser.</div>}

      <section className="card">
        <h2>Mon profil</h2>
        <form action={updateProfile} className="stack" style={{ marginTop: 10 }}>
          <div className="field">
            <label htmlFor="fullName">Nom</label>
            <input className="input" id="fullName" name="fullName" defaultValue={user.fullName ?? ""} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="coverage">Statut CNAMGS habituel</label>
            <select className="input" id="coverage" name="coverage" defaultValue={user.defaultCoverageType ?? ""}>
              <option value="">— Non renseigné —</option>
              {coverageKeys.map((k) => (
                <option key={k} value={k}>{COVERAGE_LABELS[k].label} — {COVERAGE_LABELS[k].meta}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-block">Enregistrer</button>
        </form>
      </section>

      <section className="card">
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Changer mon mot de passe</summary>
          <form action={changePassword} className="stack" style={{ marginTop: 10 }}>
            <div className="field">
              <label htmlFor="currentPassword">Mot de passe actuel</label>
              <input className="input" id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            <div className="field">
              <label htmlFor="newPassword">Nouveau mot de passe</label>
              <input className="input" id="newPassword" name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
            </div>
            <button className="btn btn-primary btn-block">Modifier</button>
          </form>
        </details>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Mes dernières simulations</h2>
          {history.length > 0 && (
            <form action={clearHistory}><button className="btn btn-outline btn-small">Tout effacer</button></form>
          )}
        </div>
        {history.length === 0 ? (
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Rien pour l&apos;instant. Vos prochaines simulations apparaîtront ici. <Link href="/simulateur" style={{ color: "var(--blue)" }}>Faire une simulation →</Link>
          </p>
        ) : (
          <div className="stack" style={{ marginTop: 10 }}>
            {history.map((h) => (
              <div key={h.id} className="option" style={{ cursor: "default", alignItems: "flex-start" }}>
                <span>
                  {summarizeLines(h.lines).join(", ") || "Simulation"}
                  <span className="meta">{h.facilityName} · {COVERAGE_LABELS[h.coverageType as CoverageType]?.label ?? h.coverageType} · {dateFmt.format(h.createdAt)}</span>
                </span>
                <span className="badge">{formatFcfa(h.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <form action={logout}><button className="btn btn-outline btn-block">Se déconnecter</button></form>
        <details style={{ marginTop: 14 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>Supprimer mon compte</summary>
          <form action={deleteAccount} className="stack" style={{ marginTop: 10 }}>
            <p className="muted" style={{ margin: 0 }}>
              Votre profil et tout votre historique seront définitivement supprimés. Tapez SUPPRIMER pour confirmer.
            </p>
            <input className="input" name="confirm" placeholder="SUPPRIMER" autoComplete="off" />
            <button className="btn btn-red btn-block">Supprimer définitivement</button>
          </form>
        </details>
      </section>
    </main>
  );
}
