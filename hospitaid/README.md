# HospitAid — application réelle (sans paiement)

Application de recherche d'examens médicaux et de tarifs CNAMGS pour Libreville, Gabon.

## Ce qui a changé par rapport à la Phase 2/3

- **Recherche réelle** (`/simulateur`) : recherche par nom courant grâce aux synonymes
  ajoutés sur ~210 actes (glycémie, NFS, échographie abdominale, VIH, paludisme...),
  sélection multiple, calcul du ticket modérateur via l'API (`/api/search`, `/api/price`),
  branché sur la vraie base de données (2690 actes techniques + 12 consultations/
  prestations forfaitaires).
- **Établissements réels** (`/etablissements`) : liste et fiche détaillée depuis la base
  (CHUL, CHUO, CHU Jeanne Ebori, Laboratoire National de Santé Publique — tous non
  vérifiés, à confirmer).
- **Consultations et prestations forfaitaires** (`src/lib/tier-tariffs.ts`) : tarifs des
  Annexes 2 et 3 saisis en dur (consultations, accouchement, journées d'hospitalisation),
  car ils dépendent du niveau de l'établissement et non d'une lettre-clé.
- **Espace admin** (`/admin`, protégé par mot de passe) : marquer un acte ou un
  établissement comme "Vérifié", ajouter un établissement.
- **Interface aux couleurs du logo** (bleu, rouge, blanc), mobile d'abord, navigation
  en bas d'écran ; le logo est dans `public/logo.jpg`.
- **Moteur de calcul** déplacé dans `src/lib/pricing-core.ts` (fonctions pures), avec
  des tests qui reproduisent les valeurs exactes des tableaux des Annexes 2 et 3
  (secteur public et privé, y compris le dépassement d'honoraires).

## Comptes utilisateurs

- Inscription avec un **identifiant** et un mot de passe (pas d'e-mail demandé). Le mot de passe
  peut être une date de naissance (6 caractères minimum ; seuls les mots de passe triviaux
  sont refusés). Les anciens comptes créés avec un e-mail peuvent toujours se connecter avec.
- Connexion (`/connexion`), profil et historique (`/mon-compte`), changement de mot de passe.
- **Mot de passe oublié** : pas d'e-mail de récupération. L'admin attribue un mot de passe
  provisoire (`/admin/utilisateurs`) après avoir vérifié l'identité de la personne.
- Données conservées : identifiant, nom et statut CNAMGS habituel (facultatifs), historique
  des simulations. Aucune donnée médicale. Suppression du compte par l'utilisateur lui-même.
- Mots de passe : PBKDF2-SHA256 (600 000 itérations, sel aléatoire). Session : cookie
  HttpOnly signé (HMAC), 14 jours. 5 échecs de connexion par 15 minutes (IP + identifiant).
- Limite assumée : un mot de passe court ou une date de naissance se devine facilement
  par un proche, et se retrouve vite si la base fuitait. À réévaluer si des données plus
  sensibles sont ajoutées.
- `/confidentialite` : texte **provisoire**, à faire valider par un juriste.

## PDF de simulation

Bouton « Télécharger en PDF » sous le résultat (`/api/pdf`). Le serveur recalcule la simulation
(il ne fait pas confiance aux montants du navigateur) puis génère un PDF A4 : logo et
coordonnées HospitAid, patient (nom, identifiant, statut), établissement, tableau
(tarif facturé / pris en charge / à charge), totaux, mentions. Générateur maison sans dépendance
(`src/lib/pdf-writer.ts`, mise en page `src/lib/pdf-report.ts`). Les coordonnées de HospitAid se
modifient dans `/admin/parametres`.

## Règles de prix

- **Tarif conventionné** : nomenclature (lettre-clé × coefficient) ou barèmes des Annexes 2 et 3.
- **Soins infirmiers (AMI) non pris en charge** : le patient paie la totalité, quel que soit son
  statut. Configurable dans `/admin/parametres` (lettres-clés et prestations exclues).
- **Marge d'établissement** (`/admin/prix`) : % ajouté au prix facturé de l'établissement ;
  la part CNAMGS ne change pas, le supplément reste à la charge du patient.
- **Ajustement d'une prestation** : prix facturé exact et/ou tarif conventionné corrigé, pour
  un établissement ou pour tous (nécessaire pour les actes Rd/Rt dont la valeur de lettre-clé
  n'est pas connue). Chaque modification est tracée dans `AuditLog`.

## Partenaires et annonces

`/admin/annonces` : encarts partenaires (accueil et sous le résultat d'une simulation, toujours
étiquetés « Partenaire ») et bande d'annonces défilante en bas de chaque page. Dates de début et
de fin facultatives, ordre d'affichage, activation. Seuls les liens `https://` sont acceptés.

## Espace admin

`/admin` est protégé par un mot de passe (`ADMIN_PASSWORD`) et une session signée de 8 h
(`ADMIN_SESSION_SECRET`), au niveau du middleware ET de chaque action serveur. Il est
accessible depuis le pied de page (« Espace administrateur ») et depuis la page de connexion.

- **Noms des examens** (`/admin/examens`) : nom usuel et mots-clés de chaque acte et de
  chaque consultation/prestation. Le libellé officiel n'est jamais modifié. Chaque
  modification est enregistrée dans `AuditLog` (avant/après). Le seed ne remplace
  jamais un acte déjà édité à la main (`namesEditedAt`).
- Validation des actes et des établissements, ajout d'un établissement, utilisateurs, prix et marges, paramètres, partenaires et annonces.

Limites connues : un seul mot de passe admin partagé (pas de comptes admin individuels),
pas d'authentification à deux facteurs, pas de limitation sur la création de comptes, images des partenaires hébergées chez eux
(leur adresse est contactée par le navigateur du visiteur).

## Recherche

Insensible aux accents et à la casse (« glycemie » = « Glycémie »), tous les mots saisis
doivent être présents dans le nom officiel, le nom usuel, les mots-clés ou le code. Colonne
`Exam.searchText`, maintenue par le seed et par l'admin.

## Installation locale

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
npm test
```

## Déploiement (Vercel + Neon, comme en Phase 2)

Le script `vercel-build` exécute automatiquement `prisma db push` puis le seed à
chaque déploiement — aucune commande manuelle nécessaire une fois les fichiers sur
GitHub et les variables d'environnement configurées sur Vercel.

## Prochaines étapes possibles

- Comptes admin individuels, récupération de mot de passe par e-mail.
- Mentions légales et contact de l'éditeur (informations à fournir), validation juridique de la politique de confidentialité.
- Vérifier et compléter les coordonnées des établissements.
- Étendre les synonymes à davantage d'actes (256/2690 actuellement).
- Reprendre le système de paiement (Phase 6) quand vous serez prêt.
