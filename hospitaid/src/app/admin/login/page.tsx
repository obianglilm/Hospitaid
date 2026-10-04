import { login } from "./actions";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="container" style={{ maxWidth: 420, paddingTop: 40 }}>
      <h1 className="page-title">Connexion admin</h1>
      <p className="page-sub">Accès réservé à l&apos;équipe HospitAid.</p>
      <form action={login} className="stack">
        <input className="input" type="password" name="password" placeholder="Mot de passe admin" required autoFocus />
        <button className="btn btn-primary btn-block">Se connecter</button>
      </form>
      {searchParams.error === "throttled" && <p style={{ color: "#C2282A", fontSize: 13.5, marginTop: 10 }}>Trop de tentatives. Patientez 15 minutes.</p>}
      {searchParams.error && searchParams.error !== "throttled" && <p style={{ color: "#C2282A", fontSize: 13.5, marginTop: 10 }}>Mot de passe incorrect.</p>}
    </main>
  );
}
