# LAMANNE — État courant

*Dernière mise à jour : 08 août 2026*

## Vue d'ensemble

Projet à ~90% d'avancement.

- Sécurité : 100% (chantier versements client réparé cette session)
- Fonctionnel métier : ~98% (cœur transactionnel réparé, versements fonctionnels des 2 côtés)
- UI/design : ~70% — portails commercial et client 100% refaits ; admin NON refait (brut)
- Intégration paiement : 0% (clés GeniusPay reçues, intégration à faire)
- PWA / branding : icône + intro animée + logo unifié faits
- Observabilité : 0% (à installer avant lancement)

## Fait à la session du 8 août 2026

### Chantier sécurité CRITIQUE — versements réparés (le plus important)
Découverte : le cœur transactionnel de LAMANNE ne fonctionnait pas.
- Les 3 pages client faisaient des writes directs navigateur (insert cotisations/payments)
  bloqués par les RLS → création + versements client cassés en prod.
- La RPC record_payment appelée par l'API commerciale versement n'existait pas en base
  → versements commercial cassés aussi.
- Codes de retrait générés côté client avec Math.random (prévisible).

Corrections :
- RPC record_payment créée (supabase/record-payment.sql) : atomique (FOR UPDATE),
  idempotente, génère withdrawal_code 6 chiffres unique à completed, refuse cas invalides.
  Testée sur 4 cas. SECURITY DEFINER.
- 2 API routes client : /api/client/nouvelle-cotisation + /api/client/versement.
- 3 pages client migrées vers ces API (fin des writes directs + Math.random).
- La RPC a réparé le versement commercial du même coup.

### Refonte design — COMMERCIAL 100%
dashboard, mes-clients (liste + fiche), catalogue (liste + produit), encaissements, stats,
profil, modals. Vert/or, Sora, mobile-first, ProgressRing, barres dégradées.

### Refonte design — CLIENT 100%
catalogue + produit, cotisations (liste + détail héros anneau + code retrait), historique,
profil, catalogue public, auth (login/register). Flow ?for_client= (A+B) branché, bug de
flow corrigé (contexte perdu + clients bloqués RLS → via /api/commercial/clients).

### Migration palette globale
Bleu (#0D3B8C/#378ADD) → vert/or (#0F5132/#F2A900). Config + 29 fichiers + sémantique.

### PWA / branding
Icône LAMANNE (public/icons/icon-master.svg + PNG), manifeste corrigé, AppIntro animé,
composant Logo remplaçant "LM" partout.

## Prochaine priorité (nouvelle conversation)
1. Portail ADMIN — refonte design + AUDIT sécurité (vérifier writes directs / RPC manquantes
   comme côté client). Écrans : dashboard, produits, catégories, équipe, clients, cotisations,
   versements, retraits, remboursements, admin-login. Portail du gérant FAMIENWA.
2. GeniusPay — clés reçues, intégration paiement en ligne.

## Dettes techniques
- Page orpheline app/commercial/mes-clients/[clientId]/nouvelle-cotisation (code mort, supprimer).
- API /api/commercial/clients à harmoniser sur helpers standard.
- Démarrage cotisation non atomique (insert cotisation + payment séparés) client + commercial.
- Deadline calculée en double (trigger + JS, inoffensif).
- product-card.tsx en hex dur au lieu de classes (cosmétique).
- Idempotence versement : clé par clic (protège rejeux réseau, pas double-clic strict).

## Chantiers restants
GeniusPay ; admin (refonte + audit) ; cron expirations ; export CSV /admin/versements ;
domaine lamanne.ci ; guide FAMIENWA .docx ; refonte auth (Google + Twilio WhatsApp OTP) ;
Resend emails ; observabilité (Sentry + Vercel Spend + Uptime Robot) ; capacity model ;
tests E2E ; mise en prod.

## Infrastructure
- Deployment Protection Vercel DÉSACTIVÉE cette session (test mobile previews). Réactiver
  avant lancement si besoin.
- Upgrade Vercel Pro avant lancement (Firewall + Spend). Bloqueur : cartes africaines
  refusées par Stripe (tester UBA débit, Chipper Cash, Eversend).
- Attack Challenge Mode OFF ; AI Bots blocker ON.

## Objectif court terme
Démo propre pour le gérant FAMIENWA (M. N'GUESSAN Kouamé Félix). Commercial + client soignés,
admin à faire. Pas de vrais users en prod (phase dev).

## Méthode
Branche par lot, commits fréquents, relecture ligne par ligne, merge après test mobile réel.
Prompts Claude Code ciblés (fichiers autorisés + interdictions + grep vérif). Reconnaissance
(cat/grep) en terminal direct. Reco CTO décisive attendue.
