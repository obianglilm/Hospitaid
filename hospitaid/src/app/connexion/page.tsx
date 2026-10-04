import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "./actions";
import { getCurrentUserId } from "@/lib/current-user";
import { safeNextPath } from "@/lib/account-core";

const ERRORS: Record<string, string> = {
  invalid: "E-mail ou mot de passe incorrect.",
  throttled: "Trop de tentatives. Patientez 15 minutes avant de réessayer.",
};

export default async function ConnexionPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const next = safeNextPath(searchParams.next ?? "");
  if (await getCurrentUserId()) redirect(next);
  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;

  return (
    <main className="container">
      <h1 className="page-title">Connexion</h1>
      <p className="page-sub">Retrouvez votre profil et l&apos;historique de vos simulations.</p>
      <form action={login} className="card stack">
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block">Se connecter</button>
      </form>
      <p className="muted" style={{ textAlign: "center" }}>
        Pas encore de profil ? <Link href="/inscription" style={{ color: "var(--blue)" }}>Créer mon profil</Link>
      </p>
      <p className="muted" style={{ textAlign: "center" }}>
        Vous êtes administrateur ? <Link href="/admin" style={{ color: "var(--blue)" }}>Accéder à l&apos;espace admin</Link>
      </p>
    </main>
  );
}
