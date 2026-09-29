# HospitAid — Phase 4 (application réelle, sans paiement)

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
- **Espace admin minimal** (`/admin`) : marquer un acte ou un établissement comme
  "Vérifié", ajouter un établissement. **Pas encore protégé par mot de passe** —
  voir avertissement ci-dessous.
- **Moteur de calcul** déplacé dans `src/lib/pricing-core.ts` (fonctions pures), avec
  des tests qui reproduisent les valeurs exactes des tableaux des Annexes 2 et 3
  (secteur public et privé, y compris le dépassement d'honoraires).

## ⚠️ Sécurité — à faire avant toute mise en production réelle

L'authentification (NextAuth, RBAC) a été retirée temporairement pour accélérer cette
phase. **`/admin` est donc accessible à quiconque connaît l'URL.** Avant d'ouvrir
l'application à de vrais patients ou d'y stocker des données sensibles, il faut
réintroduire une protection (mot de passe admin au minimum) sur cette page.

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

- Sécuriser `/admin` (mot de passe ou vraie authentification).
- Vérifier et compléter les coordonnées des établissements.
- Étendre les synonymes à davantage d'actes (212/2690 actuellement).
- Reprendre le système de paiement (Phase 6) quand vous serez prêt.
