# LAMANNE — Instructions Claude Code

Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session dans ce repo. Il donne le contexte projet essentiel.

## Contexte projet

LAMANNE est une PWA de paiement en cotisations progressives pour le marché ivoirien, développée par Hokma Labs pour le compte du client ETS FAMIENWA SERVICES (SARL immatriculée à Daloa, RCCM CI-DAL-2024-B-12.586, gérant N'GUESSAN Kouamé Félix).

La plateforme digitalise une pratique de tontine commerciale traditionnelle : des agents terrain (commerciaux) démarchent des clients pour l'achat progressif d'articles du quotidien. Le client paie en plusieurs versements cash collectés par l'agent, et récupère l'article une fois 100% payé.

## Où trouver quoi

- **docs/business.md** — Contexte métier, rôles, flows utilisateur détaillés
- **docs/architecture.md** — Stack technique, décisions d'architecture, patterns
- **docs/current.md** — État actuel + priorités en cours
- **docs/glossary.md** — Vocabulaire métier (cotisation, versement, retrait, remboursement, etc.)

## Stack

- Next.js 14/15 App Router, TypeScript strict
- Supabase (auth, PostgreSQL, Storage) — plan Pro
- Tailwind CSS + shadcn/ui
- Déployé sur Vercel (plan Hobby)
- Repo : Hokmalabs/lamanne

## Règles absolues

1. **Sécurité par défaut** : toute écriture DB passe par une API route serveur qui utilise `supabaseAdmin` (service_role). Les clients (users) et commerciaux ne font PAS de writes directs via `supabase-js` depuis le navigateur.
2. **Toute route API** utilise les helpers de `lib/api-security.ts` : `checkOrigin` + `requireAuth` + `requireRole` + `validateInput` (Zod) + `handleApiError`.
3. **Toute page admin server component** commence par `await requirePageAuth(["admin", "super_admin"])` en première ligne du corps (defense in depth au-delà du layout).
4. **RLS strictes** : les tables `profiles`, `cotisations`, `payments`, `notifications` autorisent SEULEMENT le SELECT du propriétaire (via `auth.uid()`). Aucun INSERT/UPDATE/DELETE direct depuis anon/authenticated. Voir `docs/architecture.md`.
5. **Grants explicites** pour toute nouvelle table dans `public` (préparer le changement Supabase du 30 octobre 2026).
6. **Pas de service_role côté browser** — jamais.

## Conventions de code

- Fichiers en TypeScript strict (`.ts` / `.tsx`)
- Server Components par défaut, Client Components ("use client") uniquement quand nécessaire (interactivité)
- Composants UI : shadcn/ui + Tailwind
- Icônes : lucide-react
- Formulaires avec validation Zod côté serveur + `lib/api-client.ts` côté client
- Messages d'erreur en français
- Ne PAS utiliser `alert()` ou `console.log` en production — préférer des toasts (à implémenter dans la refonte UI)

## Workflow attendu

Ce projet suit un workflow spécifique documenté ci-dessous. Respecte-le strictement.

1. **Avant de modifier du code** : lire les fichiers concernés + les fichiers de `docs/` pertinents
2. **Modifier UN fichier à la fois** dans la mesure du possible
3. **Prompts très ciblés** : liste explicite des fichiers autorisés, restrictions claires
4. **Toujours afficher le résultat en entier** à la fin d'une modification
5. **Ne jamais** installer de package sans confirmation explicite
6. **Ne jamais** lancer de commande shell sans confirmation

## Priorité actuelle

Voir `docs/current.md` pour l'état à jour et les priorités du moment.