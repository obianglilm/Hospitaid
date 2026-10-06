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
          Sans compte : rien n&apos;est enregistré à votre sujet. Avec un compte : votre identifiant, votre nom et votre
          statut CNAMGS habituel (le nom et le statut sont facultatifs), et l&apos;historique de vos simulations (examens choisis,
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
          Un cookie de session, strictement nécessaire à la connexion, est utilisé. Les encarts « partenaires » peuvent charger une image depuis le site du partenaire et mènent vers des sites tiers ; aucun traceur publicitaire n&apos;est installé par HospitAid.
        </p>
      </section>
      <section className="card">
        <h2>Vos droits et contact</h2>
        <p className="muted">
          Suppression : directement depuis « Mon compte ». Mot de passe oublié : il n&apos;y a pas d&apos;e-mail de récupération ; l&apos;équipe HospitAid peut vous en attribuer un
          nouveau après vérification de votre identité. Pour toute demande d&apos;accès ou de rectification, le contact
          de l&apos;éditeur sera indiqué ici avant l&apos;ouverture publique.
        </p>
      </section>
    </main>
  );
}
