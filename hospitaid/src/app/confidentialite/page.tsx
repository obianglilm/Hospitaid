export default function ConfidentialitePage() {
  return (
    <main className="container">
      <h1 className="page-title">Politique de confidentialité</h1>
      <div className="notice">
        Version provisoire, rédigée pour décrire fidèlement ce que fait l&apos;application aujourd&apos;hui. Elle doit
        être relue et validée par un juriste (protection des données personnelles au Gabon) avant toute
        ouverture large au public.
      </div>

      <section className="card">
        <h2>Ce que nous conservons</h2>
        <p className="muted">
          Sans compte : rien n&apos;est enregistré à votre sujet. Avec un compte : votre e-mail, votre nom et votre
          statut CNAMGS habituel (facultatifs), et l&apos;historique de vos simulations (examens choisis,
          établissement, statut, montant). Aucune donnée médicale (diagnostic, ordonnance, résultat) n&apos;est
          demandée. Votre mot de passe n&apos;est jamais stocké en clair : seule une empreinte irréversible est conservée.
        </p>
      </section>
      <section className="card">
        <h2>Pourquoi</h2>
        <p className="muted">
          Uniquement pour vous permettre de retrouver votre profil et vos simulations. Aucune publicité, aucune
          revente de données.
        </p>
      </section>
      <section className="card">
        <h2>Combien de temps</h2>
        <p className="muted">
          Jusqu&apos;à ce que vous supprimiez votre compte. Depuis « Mon compte », vous pouvez effacer votre historique
          ou supprimer définitivement votre compte à tout moment.
        </p>
      </section>
      <section className="card">
        <h2>Où sont les données</h2>
        <p className="muted">
          L&apos;application est hébergée par Vercel et la base de données par Neon, dans la région
          américaine « us-east-2 » (hors du Gabon). Les polices de caractères sont chargées depuis Google Fonts.
          Un cookie de session, strictement nécessaire à la connexion, est utilisé ; aucun traceur publicitaire.
        </p>
      </section>
      <section className="card">
        <h2>Vos droits et contact</h2>
        <p className="muted">
          Suppression : directement depuis « Mon compte ». Pour toute demande d&apos;accès ou de rectification, le
          contact de l&apos;éditeur sera indiqué ici avant l&apos;ouverture publique.
        </p>
      </section>
    </main>
  );
}
