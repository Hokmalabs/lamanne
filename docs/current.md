# LAMANNE — État courant

*Dernière mise à jour : 24 septembre 2026 (fin de session)*

## Vue d'ensemble

- Sécurité : ~94 % (3 failles critiques fermées le 24/09)
- Fonctionnel métier : ~94 % — retraits (P1c) et chaîne remboursement restent à finir
- Paiement en ligne : conception faite, 0 % de code — compte GeniusPay prod de FAMIENWA disponible
- Contenu / juridique : 0 % — landing à chiffres inventés, CGU fausses, pas de politique de confidentialité
- Observabilité : 0 % — Tests / prod-readiness : ~20 %

## CORRECTION des docs du 23/09

Les docs du 23 disaient « feat/auth-pin MERGÉ ». C'était FAUX : les commits serveur étaient sur
la branche, et toute l'interface (login, register, profil, création client, SecretRevealDialog)
n'avait JAMAIS été commitée (restée dans la copie de travail). Séparée par stash, relue, mergée le 24.
Leçon : vérifier `git merge-base --is-ancestor <branche> main` avant d'écrire « mergé ».

## Fait le 24 septembre (tout est dans main sauf P1b)

### Lot P0 — versements fictifs (PR #2, mergé)
- `record_payment` était SECURITY DEFINER et exécutable par anon/authenticated : n'importe qui
  pouvait créditer une cotisation avec la clé anon via /rest/v1/rpc. REVOKE appliqué.
- `/api/client/versement` SUPPRIMÉE : le client s'enregistrait un versement « cash success » sans argent.
- `/api/client/nouvelle-cotisation` : le client choisissait un « premier versement » fictif.
  Désormais : cotisation à 0 F, durée choisie (min_tranches..max_tranches), confirmation en deux
  temps, maximum 3 cotisations sans versement. Rôle `user` uniquement.
- Trigger `set_cotisation_deadline` : écrasait deadline avec products.created_at + max_tranches.
  Ne remplit plus que si deadline est null, à partir de now().
- Échéance affichée depuis `cotisations.deadline` (pages cotisations client).
- Revoke par hygiène sur handle_new_user et set_cotisation_deadline.

### feat/auth-pin (mergé)
Interface PIN client : inscription 10 chiffres ou +225 + PIN 6 chiffres, connexion via
/api/auth/phone-login, choix du code après PIN temporaire, ancien PIN 4 chiffres refusé,
profil (nom via API, numéro non modifiable, changement de PIN), PIN temporaire affiché une fois
à la création client (admin/agent), reset PIN admin. Tests preview OK.

### Lot P1a — versement cash agent (mergé)
- `record_payment` v2 : verrou de ligne AVANT le contrôle d'idempotence, code de retrait tiré de
  gen_random_uuid() (CSPRNG), colonne `payments.recorded_by`, refus si refund_status requested
  ou approved, erreur si une clé est réutilisée avec d'autres données. SECURITY INVOKER,
  service_role seulement.
- Index unique `payments(transaction_ref)`, CHECK `payment_method in ('cash','online')`.
- Route `/api/commercial/versement` sur la RPC. Minimum 1 000 F SAUF pour solder le reste exact.
  Le code de retrait n'est JAMAIS renvoyé à l'agent.
- Écrans agent : une clé d'idempotence = un versement logique (régénérée seulement après succès
  ou 409) → aucun doublon après coupure réseau. Plafond sur total_price (prix figé).
  Écran « à montrer au client » après chaque versement (montant reçu, total payé, reste).

### Lot P1b — création de cotisation par l'agent (POUSSÉ, NON MERGÉ, NON RELU)
- RPC `create_cotisation_with_payment` : cotisation + premier versement (facultatif, via
  record_payment) dans une transaction, durée choisie, idempotence par pg_advisory_xact_lock +
  colonne `cotisations.creation_key` (unique). Rejeu enrichi (amount_paid, new_status).
- Catalogue agent : mode « pour moi » supprimé, durée, versement facultatif, confirmation.
- Supprimés : VersementForm (jamais affiché, et sa lecture navigateur était bloquée par la RLS),
  page orpheline mes-clients/[clientId]/nouvelle-cotisation.
- Encaissements : singleton supabaseAdmin (fin du createClient local).
- À FAIRE avant merge : relire `git show 89b2112`, confirmer l'exécution du create or replace.

## Décisions produit du 24/09

- Paiement en ligne : table `payment_intents` séparée ; `payments` = argent réellement reçu.
- Frais GeniusPay (1 % + 100 F + opérateur) : les 100 F fixes à la charge du client (affichés
  avant paiement), FAMIENWA absorbe le 1 % et l'opérateur. Minimum en ligne : 200 F crédités
  (300 F payés). À faire valider par M. N'GUESSAN + vérifier que le contrat GeniusPay autorise
  la répercussion.
- Compte marchand GeniusPay prod au nom de FAMIENWA : disponible.
- Le cash collecté par l'agent reste le cœur ; GeniusPay s'ajoute pour les clients équipés.
- Une partie des clients n'a pas de smartphone : pas d'OTP/SMS pour l'instant (échecs sur YANOU
  et SumiAfrica). Preuve client = carnet physique + écran « à montrer au client ».
- Retrait sans application : client présent + numéro + carnet ou pièce d'identité, validé par
  l'admin et tracé. L'agent ne voit jamais le code de retrait.
- Création de cotisation par le client : à 0 F. Par l'agent : premier versement facultatif.
- Landing : chiffres inventés à retirer. Chiffre réel possible : « plus de 500 cotisations par
  trimestre » (à confirmer par écrit par M. N'GUESSAN), « plus de 50 articles ».

## Base de données — modifications du 24/09 (toutes versionnées dans supabase/)
- revoke-function-exec.sql, fix-cotisation-deadline.sql, p1-record-payment-v2.sql,
  p1b-create-cotisation.sql (+ create or replace du rejeu enrichi).
- Nouvelles colonnes : payments.recorded_by, cotisations.creation_key.
- 0 doublon de transaction_ref, 0 cotisation soldée sans code, payment_method = cash (10 lignes).

## Risques / dettes ouverts (nouveaux)
- RETRAIT : la route ne vérifie AUCUN code et /admin/retraits AFFICHE le code en clair.
  Le code de retrait n'a aujourd'hui aucune fonction de sécurité → lot P1c.
- Approbation de remboursement : ne passe pas en `cancelled` (la RPC bloque les versements sur
  requested/approved en attendant).
- Échéance calculée sur max_tranches : components/DashboardContent.tsx (tableau de bord client).
- Sens de `nb_tranches` : compteur de versements dans le code, durée dans le glossaire. Durée
  réelle = deadline et tranche_amount.
- Messages d'erreur en red-50/red-700 dans AddClientButton / AddClientModal → tokens.
- SecretRevealDialog : focus clavier non placé à l'ouverture.
- Compte équipe sur le catalogue client : bouton « Démarrer » affiché puis 403 → message clair.
- Landing : « 5 000+ clients, 1 200+ articles, 98 % », « en boutique » = faux.
- Prop inutilisée commercialId (AddClientModal). Frais 10 % remboursement en dur.
- Comptes de test à supprimer au lancement (dont TEST P0, PIN 4 chiffres).

## Tests EN ATTENTE
- Test global avec de vrais agents (prévu par Joel) : création client, cotisation agent avec et
  sans premier versement, versements, double appui, coupure réseau (mode hors ligne), solde
  d'un reste < 1 000 F, solde final (code visible côté client uniquement), refus sur cotisation
  en remboursement.
- Tests en attente du 23/09 : chaîne remboursement, lot 4a produits, notification fantôme,
  photos manquantes.

## Infrastructure & décisions en suspens
- Domaine (lamanne.shop / lamanne.ci ; au nom de FAMIENWA ?) — avant GeniusPay live.
- Transfert Supabase entre organisations (conserve URL et clés) — avant GeniusPay live.
- Vercel Pro — obligatoire avant tout encaissement (usage commercial).
- 30 octobre 2026 : fin des GRANTs auto Supabase.

## Objectif court terme
Merger P1b, faire P1c, puis P2 GeniusPay en sandbox. En parallèle : décisions et contenu
juridique avec M. N'GUESSAN. Démo sur la prod.