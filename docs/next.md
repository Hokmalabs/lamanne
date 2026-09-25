# LAMANNE — Prochaine session (plan)

*Mis à jour le 24 septembre 2026 (fin de session)*

## Priorité 0 — Finir P1b (branche feat/p1b-creation-agent, poussée, NON mergée)
1. Relire : `git --no-pager show 89b2112 -- supabase/p1b-create-cotisation.sql app/api/commercial/nouvelle-cotisation/route.ts "app/commercial/catalogue/[id]/page.tsx"`
2. Confirmer que le `create or replace` de create_cotisation_with_payment (rejeu enrichi :
   amount_paid, new_status) a été exécuté dans le SQL Editor.
3. PR → merge → une création de cotisation agent en prod (avec et sans premier versement).

## Priorité 1 — P1c : retraits
- Migration : cotisations.withdrawn_by (uuid → auth.users, restrict), withdrawal_method
  ('code' | 'identite'), withdrawal_proof ('carnet' | 'piece_identite', nullable).
- Route PATCH /api/admin/retraits/[id] : body { method: "code", code } (comparé au
  withdrawal_code serveur) OU { method: "identite", proof } ; garder la garde
  `withdrawn_at is null` ; tracer withdrawn_by.
- /admin/retraits : NE PLUS AFFICHER le code. ValidateButton → modal à deux modes : saisir le
  code donné par le client, ou « vérification d'identité » (client présent, numéro affiché
  vérifié, preuve carnet / pièce cochée). Erreurs visibles (fin du console.error silencieux).

## Priorité 2 — P2 : GeniusPay en SANDBOX (voir architecture.md « Paiement en ligne »)
0. Route sonde temporaire (jeton en query string, aucune écriture) pour lire le vrai format du
   webhook, puis suppression. Attention : le payload contient le téléphone du payeur.
1. Migration : payment_intents, webhook_events, payments.intent_id, RPC
   confirm_online_payment (atomique, idempotente, ramène amount_remaining à 0 si trop-perçu).
2. lib/geniuspay.ts (fetch + node:crypto, aucune dépendance, clés serveur uniquement).
3. POST /api/payments/initiate (client propriétaire, cotisation active, pas de remboursement,
   200 F ≤ montant crédité ≤ reste, frais 100 F ajoutés, merchant_ref en metadata).
4. POST /api/webhooks/geniuspay (req.text(), HMAC, vérification GET /payments/{reference},
   égalité stricte du montant, toujours 200, exclu du middleware).
5. Page de retour (polling borné sur NOTRE base) + bouton « Payer en ligne » côté client.
Prérequis LIVE (pas sandbox) : domaine, transfert Supabase, Vercel Pro, CGU avec les frais.

## Priorité 3 — Décisions et contenu (en parallèle, avant la démo)
Questions à M. N'GUESSAN :
1. Frais 100 F en ligne à la charge du client (et contrat GeniusPay : répercussion autorisée ?).
2. Échéance dépassée sans solde : prolongation ? annulation + remboursement 90 % ?
3. Stock : réservé à la création ou à 100 % ? Rupture au retrait : remplacement ou remboursement ?
4. Prix figé à la création (déjà le cas dans le code) : à écrire dans les CGU.
5. Remboursement : délai et mode (espèces agent / siège).
6. Chiffre de la landing (500 cotisations / trimestre) : confirmation écrite.
7. Premier versement agent facultatif : OK ou acompte obligatoire ?
8. Parrainage (backlog).
Contenu à produire : landing corrigée, mentions légales, CGU/CGV, politique de confidentialité
(loi n°2013-450, ARTCI, transfert hors CI), case d'acceptation versionnée, contrat Hokma ↔
FAMIENWA (dont sous-traitance des données), question BCEAO « acompte sur vente ou collecte de
fonds » au juriste.

## Priorité 4 — Retouches rapides
- DashboardContent : échéance depuis cotisations.deadline.
- Chaîne remboursement : approbation → status 'cancelled' ; décider de l'étape 'refunded' ;
  unifier routes client et commercial.
- Tokens dans AddClientButton / AddClientModal, focus SecretRevealDialog, message clair pour un
  compte équipe sur le catalogue client, toasts.

## Priorité 5 — Lots existants
Lot 4b catégories ; lot data / RPC (/admin/versements, export CSV, stats, pagination, CHECK
min_tranches <= max_tranches et stock >= 0) ; outillage (.gitignore sw.js, Next 14.2.x CVE,
serwist, GitHub Action tsc + lint) ; pare-feu Vercel sur les routes auth publiques ;
observabilité (Sentry, uptime, alertes de dépenses).

## Avant lancement
Nettoyage des données de test, preview obligatoire + Deployment Protection, formation agents.

## Méthode (règles ajoutées le 24/09)
- Chaîne unique :
  `export NODE_OPTIONS=--max-old-space-size=4096 && rm -rf .next && npx tsc --noEmit && npm run lint && npx next build --no-lint && git restore public/sw.js && git add -A -- <fichiers listés> && git --no-pager diff --cached --stat && git commit ... && git push`
- `rm -rf .next` en tête : sinon tsc valide les types d'une AUTRE branche (.next/types).
- Fermer le navigateur pendant le build (Windows manque de RAM → « heap out of memory »).
- Suppressions de fichiers : `git rm` dans la chaîne (Claude Code ne lance pas de shell).
- Garde-fou de dépendance entre lots : `git merge-base --is-ancestor origin/<lot précédent> HEAD`.
- Ne jamais `git add -A` sans chemins : vérifier `git status --short` avant.
- Merger une PR par GitHub quand la copie de travail contient autre chose.
- Aucun placeholder dans un prompt Claude Code : coller le contenu réel (SQL compris).
- Toute clé secrète (GeniusPay) : variables Vercel serveur uniquement, jamais dans le chat.