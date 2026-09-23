# LAMANNE — Prochaine session (plan)

*Mis à jour le 23 septembre 2026*

## Priorité 0 — Tests (AVANT tout nouveau code)
Tout est mergé dans main, RIEN n'a été testé. Voir la liste « Tests EN ATTENTE » de
current.md. Rechargement forcé ou navigation privée avant de conclure (cache PWA).

Contrôle après les tests de remboursement :
`select c.id, c.status, c.refund_status, c.amount_paid, c.refund_amount from public.cotisations
 where c.refund_status is distinct from 'none';`
Attendu : refund_amount = floor(amount_paid * 0.9), status encore 'active'.

## Priorité 1 — `fix/equipe-routes` (SÉCURITÉ, passe avant tout le reste)
Fichiers : app/api/admin/equipe/route.ts, app/api/admin/equipe/[id]/route.ts,
app/api/admin/equipe/suspend/route.ts, app/admin/equipe/*.tsx, app/(auth)/login/page.tsx.
- Pattern standard partout (checkOrigin, requireAuth, requireRole, validateInput, singleton).
- Mot de passe aléatoire fort (crypto.randomBytes), renvoyé UNE FOIS à la création, jamais
  stocké ; zone de copie + avertissement dans l'UI. Champ PIN retiré du formulaire.
- Action « Régénérer le mot de passe » réservée au super_admin (sinon compte perdu = bloqué).
- `/login` onglet téléphone : mot de passe libre à la place du PIN, même résolution d'email.
- Création et nomination d'admins réservées au super_admin (API + UI).
- Suppression : bloquée (409 « suspendez plutôt ») dès qu'il existe des cotisations, des
  ventes (created_by) ou des clients assignés ; jamais sur un client. Supprimer l'action
  `delete` en double entre les deux routes.
- Ensuite : régénérer et redistribuer les mots de passe des 9 comptes existants.

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

## Priorité 4 — Lot outillage (AVANT la démo)
Next 14.2.x dernière (CVE), @typescript-eslint, serwist vs next-pwa, .gitignore public/sw.js
et workbox-*.js, GitHub Action tsc + lint. Confirmation explicite de Joel avant toute install.

## Priorité 5 — admin-login (design), toasts, contenu CGU/landing

## Priorité 6 — GeniusPay (NE PAS ATTAQUER sans feu vert explicite de Joel)
Prérequis : domaine tranché, transfert Supabase fait, Vercel Pro, race condition amount_paid
réglée (webhook rejoué = double encaissement), référence de transaction UNIQUE en base pour
l'idempotence. Clés en variables serveur uniquement. Fournir la doc API à Claude.

## Méthode
- Une branche par lot ; merge après relecture ligne par ligne.
- UNE SEULE chaîne en `&&` du `tsc` jusqu'au `git push` (un échec doit tout arrêter).
- Prompts Claude Code ciblés : fichiers autorisés, interdictions, grep de vérification.
- Mettre à jour current.md + next.md + architecture.md en fin de session.
