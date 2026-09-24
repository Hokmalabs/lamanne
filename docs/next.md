# LAMANNE — Prochaine session (plan)

*Mis à jour le 23 septembre 2026 (fin de session)*

## Priorité 1 — Agrégateur de paiement (CONCEPTION seulement)
Apporter : doc API, format et SIGNATURE des webhooks, sandbox, retours d'expérience de
l'intégration SumiAfrica. Prérequis AVANT tout encaissement réel : domaine tranché (URL
webhook), transfert Supabase, Vercel Pro, race condition amount_paid réglée, référence de
transaction UNIQUE en base (idempotence). Clés en variables serveur uniquement.

## Priorité 2 — Lot 4b : catégories
- API CRUD `/api/admin/categories` : slug généré SERVEUR (sans accents, unique → 409),
  `icon` IGNORÉ (il n'est rendu nulle part : à confirmer d'un grep).
- DELETE : si la catégorie contient des produits, exiger `reassign_to` (sinon 409 avec le
  nombre de produits). Ordre : déplacer les produits PUIS supprimer. Vérifier que
  `reassign_to` existe et diffère de la cible.
- Page `/admin/categories` (server + client) + entrée dans le menu « Plus ».
- Tester la suppression avec réaffectation sur la catégorie « Test ».
- Rappel : `categories` n'a AUCUNE policy d'écriture → tout passe par supabaseAdmin.

## Priorité 3 — Lot data / RPC
GRANTs explicites sur tout nouvel objet, ET `revoke execute ... from public, anon,
authenticated` + `grant execute ... to service_role` sur CHAQUE RPC (sinon appelable avec la
clé anon via PostgREST).
- RPC stats dashboard (total collecté, compteurs, séries) → puis graphe de collecte.
- RPC listing versements : filtres + pagination + KPIs sur la sélection COMPLÈTE (corrige les
  3 bugs + le N+1), incluant méthode `online` et statuts `pending`/`failed` pour GeniusPay.
  Puis refonte design de /admin/versements.
- API export CSV (échapper = + - @, plafond de lignes).
- Pagination /admin/cotisations + bornage des `.in()`.
- FK `cotisations.user_id → profiles.id` (0 orphelin, faisable).
- CHECK manquants : min_tranches <= max_tranches, stock >= 0.
- **Chaîne remboursement** (décision produit) : approbation → `status: 'cancelled'` ;
  l'étape `refunded` n'est PAS dans le CHECK de refund_status → l'ajouter ou s'en passer.
  Unifier les routes client et commercial en une seule.

## Priorité 4 — Lot outillage
EN TÊTE : `.gitignore` de `public/sw.js` et `workbox-*.js` (`git rm --cached`). Puis : Next
14.2.x dernière (CVE), @typescript-eslint, serwist vs next-pwa, GitHub Action tsc + lint,
middleware restreint (`matcher`) / `getClaims()`. Confirmation explicite de Joel avant toute
install.

## Priorité 5 — Pare-feu Vercel
Rate limit par IP sur les routes auth publiques (`/api/auth/phone-login`,
`/api/auth/register-phone`).

## Priorité 6 — admin-login (design), toasts, contenu CGU/landing

## Avant lancement
Nettoyage complet des données de test (voir current.md), puis index/contraintes restants.

## Backlog — Parrainage
Questions à M. N'GUESSAN : récompense, moment du versement (à la 1re cotisation terminée
pour éviter les faux comptes), qui paie, rattachement aux agents.

## Méthode
- Une branche par lot ; merge après relecture ligne par ligne.
- UNE SEULE chaîne en `&&` du `tsc` jusqu'au `git push` (un échec doit tout arrêter).
- Prompts Claude Code ciblés : fichiers autorisés, interdictions, grep de vérification.
- Mettre à jour current.md + next.md + architecture.md en fin de session.
