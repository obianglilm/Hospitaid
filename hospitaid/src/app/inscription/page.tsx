import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "./actions";
import { getCurrentUserId } from "@/lib/current-user";
import { COVERAGE_LABELS, type CoverageType } from "@/lib/pricing-core";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

const ERRORS: Record<string, string> = {
  username: "Identifiant invalide : 3 à 30 caractères (lettres, chiffres, point, tiret ou _), sans caractères spéciaux.",
  consent: "Merci de cocher la case pour accepter la politique de confidentialité.",
  password: `Mot de passe refusé : au moins ${MIN_PASSWORD_LENGTH} caractères, et pas un mot de passe trop courant (123456, etc.).`,
  exists: "Cet identifiant est déjà pris. Essayez-en un autre (par exemple en ajoutant un chiffre).",
};

export default async function InscriptionPage({ searchParams }: { searchParams: { error?: string; username?: string } }) {
  if (await getCurrentUserId()) redirect("/mon-compte");
  const error = searchParams.error ? ERRORS[searchParams.error] : undefined;

  return (
    <main className="container">
      <h1 className="page-title">Créer mon profil</h1>
      <p className="page-sub">Un identifiant et un mot de passe suffisent. Pas besoin d&apos;adresse e-mail.</p>
      <form action={register} className="card stack">
        <div className="field">
          <label htmlFor="username">Identifiant (nom d&apos;utilisateur)</label>
          <input className="input" id="username" name="username" type="text" required autoComplete="username"
            autoCapitalize="none" autoCorrect="off" maxLength={40} defaultValue={searchParams.username ?? ""}
            placeholder="ex. marie.ndong" />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe ({MIN_PASSWORD_LENGTH} caractères minimum)</label>
          <input className="input" id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" />
          <span className="muted" style={{ fontSize: 12 }}>
            Vous pouvez utiliser votre date de naissance complète (ex. 15031985). Attention : c&apos;est facile à
            deviner par un proche. Ajoutez une lettre ou un symbole si vous le souhaitez.
          </span>
        </div>
        <div className="field">
          <label htmlFor="fullName">Nom complet (facultatif — apparaît sur vos PDF)</label>
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
            J&apos;ai lu la <Link href="/confidentialite">politique de confidentialité</Link>. Je comprends que mon
            identifiant et l&apos;historique de mes simulations sont conservés jusqu&apos;à la suppression de mon compte, et
            qu&apos;en cas d&apos;oubli du mot de passe, il faudra contacter l&apos;équipe HospitAid.
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
