import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "./actions";
import { getCurrentUserId } from "@/lib/current-user";
import { COVERAGE_LABELS, type CoverageType } from "@/lib/pricing-core";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

const ERRORS: Record<string, string> = {
  email: "Cette adresse e-mail n'est pas valide.",
  consent: "Merci de cocher la case pour accepter la politique de confidentialité.",
  password: `Mot de passe trop faible : au moins ${MIN_PASSWORD_LENGTH} caractères, pas trop prévisible.`,
  exists: "Un compte existe déjà avec cet e-mail. Essayez de vous connecter.",
};

export default async function InscriptionPage({ searchParams }: { searchParams: { error?: string; email?: string } }) {
  if (await getCurrentUserId()) redirect("/mon-compte");
  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;

  return (
    <main className="container">
      <h1 className="page-title">Créer mon profil</h1>
      <p className="page-sub">Gardez l&apos;historique de vos simulations et gagnez du temps à chaque visite.</p>
      <form action={register} className="card stack">
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={searchParams.email ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe ({MIN_PASSWORD_LENGTH} caractères minimum)</label>
          <input className="input" id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
        </div>
        <div className="field">
          <label htmlFor="fullName">Nom (facultatif)</label>
          <input className="input" id="fullName" name="fullName" type="text" maxLength={80} autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="coverage">Votre statut CNAMGS habituel (facultatif)</label>
          <select className="input" id="coverage" name="coverage" defaultValue="">
            <option value="">— Je ne sais pas / plus tard —</option>
            {(Object.keys(COVERAGE_LABELS) as CoverageType[]).map((k) => (
              <option key={k} value={k}>{COVERAGE_LABELS[k].label} — {COVERAGE_LABELS[k].meta}</option>
            ))}
          </select>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" name="consent" />
          <span>
            J&apos;ai lu la <Link href="/confidentialite">politique de confidentialité</Link>. Je comprends que
            mon e-mail et l&apos;historique de mes simulations sont conservés jusqu&apos;à la suppression de mon compte.
          </span>
        </label>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="btn btn-primary btn-block">Créer mon profil</button>
      </form>
      <p className="muted" style={{ textAlign: "center" }}>
        Déjà inscrit ? <Link href="/connexion" style={{ color: "var(--blue)" }}>Se connecter</Link>
      </p>
    </main>
  );
}
