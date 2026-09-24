# HospitAid — Phase 2 (Fondations)

Plateforme de recherche d'examens médicaux et de tarifs CNAMGS pour Libreville, Gabon.

## État actuel

Ce squelette contient les fondations validées en Phase 1/2 :

- **Schéma Prisma complet** (`prisma/schema.prisma`) : établissements, examens,
  nomenclature, lettres-clés (Annexe 1 CNAMGS), tarifs, règles de couverture,
  paiement, accès, audit, imports.
- **Authentification** (`src/lib/auth.ts`) : NextAuth (credentials), RBAC via
  `role` dans la session.
- **RBAC serveur** (`src/lib/rbac.ts`, `src/middleware.ts`) : le middleware
  protège les pages `/admin` et `/mon-compte` ; `requireRole()` doit être
  appelé dans CHAQUE route API sensible (le middleware seul ne suffit pas).
- **Moteur de tarification** (`src/lib/pricing-engine.ts`) : implémente la
  vraie formule du ticket modérateur telle que trouvée dans le document
  officiel (Annexe 1) : `ticket modérateur = tarif facturé − (tarif
  conventionné × taux de prise en charge CNAMGS)`. Gère le cas public
  (tarif facturé = tarif conventionné) et le cas privé (dépassement
  d'honoraires).
- **Tests unitaires** (`src/lib/__tests__/`) : couvrent les 4 statuts CNAMGS
  et reproduisent les exemples chiffrés du document officiel.
- **Seed** (`prisma/seed.ts`) : valeurs officielles des 18 lettres-clés
  (Annexe 1) et règles de couverture par défaut (80/90/100/0 %).

## Statut PAF

**PAF = Particulier À ses Frais** (personne non assurée) — confirmé par le
porteur de projet. Taux de prise en charge CNAMGS = 0 %, le patient règle
la totalité du tarif facturé. Ce n'est pas un cas nommé dans le document
Annexe 1 (qui ne couvre que les personnes assurées), mais la logique de
calcul reste identique : `ticket modérateur = tarif facturé − 0 = tarif facturé`.

## Installation

```bash
npm install
cp .env.example .env   # puis renseigner DATABASE_URL et NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

## Tests

```bash
npm test
```

## Prochaines étapes (Phase 3)

- Import de la nomenclature CNAMGS depuis le PDF (extraction assistée +
  relecture humaine obligatoire avant publication — voir Phase 1, section 5bis).
- Saisie/vérification des établissements de Libreville (CHUL, CHUO, CHU
  Jeanne Ebori...).
- Association examens ↔ établissements avec tarifs (conventionné +
  facturé le cas échéant) et statut de validation.
