import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resetUserPassword } from "../actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Africa/Libreville" });

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string; reset?: string; error?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ username: { contains: q.toLowerCase() } }, { fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q.toLowerCase() } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, username: true, email: true, fullName: true, createdAt: true },
  });
  const total = await prisma.user.count();

  return (
    <main className="container" style={{ maxWidth: 680 }}>
      <Link href="/admin" className="back-link">← Espace admin</Link>
      <h1 className="page-title">Utilisateurs</h1>
      <p className="page-sub">
        {total} compte{total > 1 ? "s" : ""}. Sans adresse e-mail, un mot de passe oublié se règle ici : vérifiez
        l&apos;identité de la personne, attribuez-lui un mot de passe provisoire et communiquez-le-lui ; elle pourra
        le changer depuis « Mon compte ».
      </p>
      {searchParams.reset && <div className="notice notice-blue" role="status">Nouveau mot de passe enregistré pour « {searchParams.reset} ».</div>}
      {searchParams.error === "password" && <div className="notice" role="alert">Mot de passe refusé (6 caractères minimum, pas trop courant).</div>}
      {searchParams.error === "notfound" && <div className="notice" role="alert">Utilisateur introuvable.</div>}

      <form method="get" className="stack" style={{ marginBottom: 12 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Rechercher un identifiant ou un nom…" />
        <button className="btn btn-primary btn-block">Rechercher</button>
      </form>

      <div className="stack">
        {users.map((u) => (
          <form key={u.id} action={resetUserPassword} className="card" style={{ margin: 0, padding: 12 }}>
            <input type="hidden" name="userId" value={u.id} />
            <p style={{ margin: "0 0 8px" }}>
              <strong>{u.username ?? u.email}</strong>
              {u.fullName ? ` — ${u.fullName}` : ""}
              <span className="muted"> · inscrit le {dateFmt.format(u.createdAt)}</span>
            </p>
            <div className="field">
              <label htmlFor={`pw-${u.id}`}>Nouveau mot de passe provisoire</label>
              <input className="input" id={`pw-${u.id}`} name="newPassword" type="text" minLength={6} required autoComplete="off" />
            </div>
            <button className="btn btn-outline btn-small" style={{ marginTop: 8 }}>Réinitialiser</button>
          </form>
        ))}
        {users.length === 0 && <p className="muted">Aucun utilisateur.</p>}
      </div>
    </main>
  );
}
