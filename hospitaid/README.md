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

- Inscription (`/inscription`), connexion (`/connexion`), profil et historique (`/mon-compte`).
- Données conservées : e-mail, nom et statut CNAMGS habituel (facultatifs), historique des
  simulations. Aucune donnée médicale. Suppression du compte et de l'historique par
  l'utilisateur lui-même (`/mon-compte`).
- Mots de passe : PBKDF2-SHA256 (600 000 itérations, sel aléatoire), jamais stockés en clair.
- Session : cookie HttpOnly signé (HMAC), 14 jours. Un jeton utilisateur n'ouvre pas l'admin.
- Limitation des tentatives : 5 échecs par 15 minutes (par adresse IP + e-mail ; par IP pour l'admin).
- `/confidentialite` : texte **provisoire** décrivant ce que fait l'application, à faire
  valider par un juriste avant ouverture au public.

## Espace admin

`/admin` est protégé par un mot de passe (`ADMIN_PASSWORD`) et une session signée de 8 h
(`ADMIN_SESSION_SECRET`), au niveau du middleware ET de chaque action serveur. Il est
accessible depuis le pied de page (« Espace administrateur ») et depuis la page de connexion.

- **Noms des examens** (`/admin/examens`) : nom usuel et mots-clés de chaque acte et de
  chaque consultation/prestation. Le libellé officiel n'est jamais modifié. Chaque
  modification est enregistrée dans `AuditLog` (avant/après). Le seed ne remplace
  jamais un acte déjà édité à la main (`namesEditedAt`).
- Validation des actes et des établissements, ajout d'un établissement.

Limites connues : un seul mot de passe admin partagé (pas de comptes admin individuels),
pas d'authentification à deux facteurs, pas de récupération de mot de passe par e-mail pour
les utilisateurs, pas de limitation sur la création de comptes.

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
