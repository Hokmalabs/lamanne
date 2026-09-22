# LAMANNE — État courant

*Dernière mise à jour : 22 septembre 2026*

## Vue d'ensemble

Projet à ~84% d'avancement (réévalué : le 90% du 8 août mesurait surtout le code écrit, pas la prod-readiness).

- Sécurité : ~95% — admin audité (propre), fix annulation client fait mais NON TESTÉ
- Fonctionnel métier : ~92% — chaîne remboursement incomplète, bugs fonctionnels sur /admin/versements
- UI/design : ~85% — commercial + client 100% ; admin refait sauf produits, catégories, versements, admin-login
- Intégration paiement : 0% — GeniusPay : clés + API disponibles, feu vert Joel attendu
- Observabilité : 0%
- Tests / prod-readiness : ~10%
- Infra : Supabase passé en plan Pro (projet réactivé après une pause)

## Fait à la session du 22 septembre 2026

Reprise après plus d'un mois d'interruption. Supabase était en pause pendant toute la session :
RIEN de ce qui suit n'a été testé contre la base ni sur téléphone réel.

### 1. Fix annulation / demande de remboursement client (sécurité + fonctionnel)
Branche `fix/client-annulation-api` (commit 3891803).
- Bug : les 2 CancelModal de `app/(dashboard)/cotisations/` (liste + détail) faisaient un UPDATE direct
  navigateur sur `cotisations` → bloqué par RLS → demande de remboursement jamais enregistrée en prod.
  Le montant remboursé (90%) était en plus calculé côté navigateur (manipulable).
- Correctif : nouvelle API `POST /api/client/annuler-cotisation` (pattern standard, calquée sur
  /api/client/versement). Gardes : existence → propriété → status 'active' → pas de demande en cours.
  `refund_amount = Math.floor(amount_paid * 0.9)` calculé serveur. Notification client non bloquante.
  Les 2 modals appellent l'API via `apiPost`.
- DÉCISION MÉTIER : la demande écrit UNIQUEMENT `refund_status: 'requested'` (+ refund_amount,
  refund_requested_at, cancellation_reason). La cotisation RESTE `active`. L'annulation effective
  (`status: 'cancelled'`) doit se faire à l'approbation admin (pas encore implémenté, voir dettes).
- La garde doublon est tolérante : `if (cot.refund_status && cot.refund_status !== 'none')`
  (le défaut réel de la colonne en base — NULL ou 'none' — n'a pas pu être vérifié).

### 2. Audit sécurité du portail admin
Verdict : architecture PROPRE. 0 write direct navigateur, 0 Math.random, 0 RPC appelée (donc 0 RPC
fantôme). Toutes les écritures passent par les 8 API routes admin (10 handlers).
Seul écart : les 3 pages produits sont des Client Components → pas de `requirePageAuth` possible
(layout + API guards protègent quand même). À traiter au lot 4 via server wrapper.

### 3. Refonte admin — lots design (chaque lot empilé sur le précédent)
- **Lot 1 — `design/admin-fondations`** (d379c9b) : layout, sidebar, bottom nav. Hex → tokens,
  `#1a1f36` → `bg-gray-900` (unifie header mobile/bottom nav avec la sidebar), Sora sur les titres,
  zones tactiles 44px, min-w-0/truncate, console.log du rôle supprimé du layout.
- **Lot 2a — `design/admin-lot2a`** (1956453) : remboursements, retraits, équipe.
  Singleton `supabaseAdmin` (fin des createClient locaux), console.log supprimés, N+1 éliminés
  (pattern Map), `fetch` brut → `apiPatch` avec try/catch (plus de refresh sur échec), design.
- **Lot 2b — `design/admin-lot2b`** (852f447 + commit "carte Clients") : dashboard + clients.
  Héros = total collecté + ProgressRing du taux de complétion moyen des cotisations actives.
  4 StatCards : Cotisations actives / Clients / Retraits en attente / Remboursements
  (prop `bg` hex → `bgClass`). N+1 des dernières cotisations éliminé. Palette corrigée (voir 4).
  Bouton « Approuver » repassé en primary (contraste). `justify-center` ajouté sur équipe.
- **Lot 3a — `design/admin-lot3a`** : cotisations. Singleton, N+1 éliminé, garde division par zéro
  sur la progression, plus aucun `any`, `.progress-bar-fill`, état vide harmonisé.

### 4. Palette — tokens Tailwind corrigés
Doublons découverts : `lamanne.success` = primary et `lamanne.warning` = accent.
Corrigé dans `tailwind.config.ts` : `success: #2D9B6F`, `warning: #F5A623`, ajout `soft: #FEF3D7`
(or pâle des avatars/badges, jamais tokenisé avant). Règle : bouton plein = primary ;
success réservé aux fonds et textes de statut.

## Branches — AUCUNE mergée, AUCUNE testée
- `fix/client-annulation-api` (part de main, indépendante)
- `design/admin-fondations` → `design/admin-lot2a` → `design/admin-lot2b` → `design/admin-lot3a`
  (chaîne empilée : merger `design/admin-lot3a` apporte les 4 lots)

## Dettes techniques

### Nouvelles (session 22 sept.)
- **/admin/versements — 3 bugs FONCTIONNELS** : (1) le filtre commercial s'applique en JS APRÈS la
  pagination (ne filtre que les 50 lignes de la page) ; (2) recherche appliquée 2 fois (SQL sur
  transaction_ref seul, puis JS sur nom/tél) → chercher un client par nom ne renvoie presque rien ;
  (3) KPIs (total, nombre) calculés sur les 50 lignes affichées, pas sur la sélection.
  + N+1 ~150 requêtes / 50 versements. Correctif = RPC Postgres (lot data).
- **ExportButton** de /admin/versements appelle `/api/admin/versements/export` qui N'EXISTE PAS.
- **Dashboard « Total collecté »** : `select("amount_paid")` sur TOUTE la table + reduce JS à chaque
  affichage → RPC SUM. Idem pour les compteurs.
- **/admin/cotisations sans pagination** (charge toute la table) ; son `.in("id", userIds)` n'est pas
  borné → casse silencieusement au-delà de ~500 clients distincts. Même risque sur /admin/clients
  (`.in("user_id", clientIds)`).
- **Pas de FK `cotisations.user_id → profiles.id`** (les deux pointent sur auth.users) → embed
  PostgREST `profiles(...)` impossible, d'où le pattern Map.
- **Chaîne remboursement incomplète** : l'approbation admin passe `refund_status: 'approved'` mais ne
  passe pas `status: 'cancelled'` et rien ne gère l'étape `refunded`.
- `requirePageAuth` absent des 3 pages produits (Client Components) → server wrapper au lot 4.
- Échecs d'actions admin silencieux (console.error seul) → toasts. Idem échec de chargement retraits.
- Frais d'annulation 10% en dur (`* 0.9`) → paramètre métier configurable un jour.
- Contraste : texte `lamanne-success` (#2D9B6F) sur blanc ~3,1:1 (sous AA) — à surveiller au test.

### Héritées (8 août, toujours ouvertes)
- Page orpheline app/commercial/mes-clients/[clientId]/nouvelle-cotisation (code mort).
- Code mort sous /commercial/clients/.
- API /api/commercial/clients à harmoniser sur helpers standard.
- Démarrage cotisation non atomique (insert cotisation + payment séparés).
- Deadline calculée en double (trigger + JS, inoffensif).
- product-card.tsx en hex dur.
- Idempotence versement : clé par clic (pas double-clic strict).
- Race condition amount_paid (hors record_payment).

## Chantiers restants avant MVP
Tests + merge des 5 branches ; lot data/RPC ; lot 4 (produits + catégories) ; versements design ;
admin-login ; chaîne remboursement ; GeniusPay ; observabilité (Sentry + Vercel Spend + Uptime Robot) ;
Vercel Pro ; grants explicites (deadline 30 oct. 2026) ; cron expirations ; domaine lamanne.ci ;
guide FAMIENWA .docx ; refonte auth (Google + WhatsApp OTP) ; Resend ; tests E2E ; mise en prod.

## Infrastructure
- Supabase : plan Pro activé (22 sept.), projet réactivé après pause.
- Deployment Protection Vercel DÉSACTIVÉE (tests mobiles previews) — réactiver avant lancement.
- Upgrade Vercel Pro avant lancement. Bloqueur : cartes africaines refusées par Stripe
  (tester UBA débit, Chipper Cash, Eversend).
- Attack Challenge Mode OFF ; AI Bots blocker ON.
- 30 octobre 2026 : fin des GRANTs auto Supabase pour nouvelles tables public.

## Objectif court terme
Démo propre pour le gérant FAMIENWA (M. N'GUESSAN Kouamé Félix). Pas de vrais users en prod.

## Méthode
Branche par lot, commits fréquents, relecture ligne par ligne, merge après test mobile réel.
Prompts Claude Code ciblés (fichiers autorisés + interdictions + grep vérif). Reconnaissance
(cat/grep) en terminal direct. Joel n'édite pas à la main. Reco CTO décisive attendue.