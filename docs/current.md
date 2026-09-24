# LAMANNE — État courant

*Dernière mise à jour : 23 septembre 2026 (fin de session)*

## Vue d'ensemble

Projet à ~86%. Supabase en plan Pro, disponible.

- Sécurité : ~90 %
- Fonctionnel métier : ~93% — chaîne remboursement toujours incomplète
- UI/design : ~92% — reste versements, produits testés mais pas validés, admin-login
- Intégration paiement : 0% — GeniusPay en attente (domaine à trancher d'abord)
- Observabilité : 0% — Tests / prod-readiness : ~15%

## Fait le 23 septembre (suite) — fix/equipe-routes MERGÉ (PR #1)
- Routes équipe au pattern standard ; garde centrale `lib/equipe-guards.ts` (admin → commerciaux
  seulement ; tout ce qui touche un admin → super_admin ; jamais soi-même, un super_admin ou un client).
- Mot de passe équipe XXXX-XXXX-XXXX généré serveur (`lib/staff-password.ts`), affiché UNE fois,
  régénérable ; enregistré par Chrome sur le téléphone de l'agent (décision).
- Suspension = ban Supabase Auth + `is_suspended` (rollback si l'un échoue).
- Suppression : super_admin uniquement, bloquée (409) dès qu'il existe un historique.
- `/login` : `redirectTo` sécurisé (redirection ouverte corrigée).
- `lib/phone.ts` : normalisation unique des numéros (10 chiffres ou +225).

## Fait le 23 septembre (suite 2) — feat/auth-pin MERGÉ
- Clients : PIN 6 chiffres haché scrypt par NOTRE serveur (table `auth_pins`, sans policy) ;
  mot de passe Supabase aléatoire jamais utilisé → l'endpoint Supabase direct ne sert plus à rien.
- `POST /api/auth/phone-login` : essai réservé AVANT vérification (RPC `pin_attempt_begin`, verrou
  ligne), blocage 5 → 15 min, 10 → 1 h, 15+ → 24 h ; hash factice pour les numéros inexistants.
- PIN faibles refusés (répétitions, suites, ababab, abcabc, fin du numéro).
- Création client UNIQUE : `lib/client-accounts.ts` (inscription, agent, admin). Agent/admin →
  PIN temporaire affiché une fois, valable 7 jours, changement obligatoire à la 1re connexion.
  (Corrige le bug : les clients créés par un agent ou un admin ne pouvaient pas se connecter.)
- Reset PIN par admin (`/admin/clients`). Changement de PIN dans le profil client.
- Inscription publique Supabase DÉSACTIVÉE ; `/register` = téléphone uniquement ; `/login` ouvre
  sur l'onglet Téléphone après une inscription (`?registered=1`), sur l'onglet Email sinon ;
  lien « mot de passe oublié » (page inexistante) retiré.
- Profil client réparé (colonnes parrainage inexistantes → page vide ; écriture navigateur
  silencieusement refusée par RLS). Numéro non modifiable par le client.
- Parrainage : UI retirée, `supabase/referral.sql` NON appliqué → backlog.
- Index unique `profiles(phone) where phone <> ''`. Migration versionnée : `supabase/auth-pins.sql`.

## Risques / dettes ouverts (nouveaux)
- Pare-feu Vercel : limiter par IP `/api/auth/phone-login` et `/api/auth/register-phone` AVANT
  lancement (scrypt coûte du CPU à chaque essai ; squat de numéro à l'inscription).
- Les sessions ouvertes survivent à un reset de PIN ou de mot de passe (levier : suspension).
- Middleware : `getUser()` sur quasiment chaque requête (FinOps) → lot outillage.
- 11 anciens comptes sans "225" (dont l'ancien admin) + anciens clients sans PIN : à supprimer
  au nettoyage de lancement (garder super_admin, produits, catégories ; script SQL dans l'ordre
  des FK : payments → cotisations → notifications → profiles → auth.users).
- Doublons à factoriser : `lockedMessage` (2 routes), `PasswordRevealDialog` vs `SecretRevealDialog`.
- Prop inutilisée `commercialId` dans `AddClientModal`.

## Règles de méthode ajoutées
- `npm run build` dans CHAQUE chaîne (un page.tsx n'exporte que default + config de route :
  tsc ne le voit pas, le build Vercel si). `git restore public/sw.js` après chaque build.

## Fait à la session du 23 septembre

Tout est MERGÉ DANS MAIN (plus aucune branche en attente). Décision : on merge après
relecture, sans passer par la preview, tant qu'il n'y a pas de vrais utilisateurs.

### 1. Merges des branches du 22 septembre
`fix/client-annulation-api` puis `design/admin-lot3a` (= les 4 lots admin empilés).

### 2. Lot 3b — retouches (`fix/lot3b-retouches`)
Montant « payé / total » sur /admin/cotisations (carte + tableau), filtres en rangée
scrollable, suppression du mot « boutique » dans admin/retraits et les 2 écrans client
→ « à votre agent ou au siège à Daloa » (DÉCISION MÉTIER, voir business.md).

### 3. Lot 4a — produits (`design/admin-lot4a`)
- **Server wrappers** : les 3 pages produits ont enfin `requirePageAuth` (les Client
  Components sont devenus ProduitsClient / NouveauProduitClient / ModifierProduitClient).
- **Liste** : cartes mobiles (l'ancienne ligne était illisible), recherche insensible aux
  accents, filtre par catégorie, erreurs de chargement ET d'action visibles (fin des alert()),
  actions 44px, `<Button asChild>` (un <button> dans un <a> était du HTML invalide).
- **ProductForm partagé** (~700 lignes dupliquées éliminées) : upload après validation,
  extension déduite du MIME, `upsert: false`, rejet des formats et des fichiers > 5 Mo avec
  message, nettoyage best effort des fichiers envoyés si l'API échoue, revokeObjectURL,
  switchs `role="switch"`. **La page « modifier » gère enfin les photos** (impossible avant).
- **API** : plafonds prix (100 M) et stock, cohérence min/max quand un SEUL des deux est
  envoyé (lecture DB préalable), 404 au lieu d'un `{ok:true}` silencieux sur id inexistant,
  images restreintes au préfixe du bucket, DELETE bloqué par TOUTE cotisation liée + 23503.

### 4. Base — FK passées en ON DELETE RESTRICT (`supabase/fk-restrict.sql`)
`cotisations.product_id`, `cotisations.user_id` et `payments.user_id` étaient en CASCADE :
supprimer un produit ou un compte effaçait cotisations ET versements. RÈGLE MÉTIER : on
DÉSACTIVE ou on SUSPEND, on ne supprime jamais.

### 5. Données — catégories
53 des 58 produits réaffectés de « Test » vers 9 catégories (créées : Matériaux de
construction, Motos & Transport). Restent dans « Test » : Gbggg et Test Produit H-2 Modif
(données de test, serviront à tester la suppression avec réaffectation), plus N'goblalè,
Sè ba et Tani kpa (nature à préciser par Joel).

### 6. BUG CRITIQUE corrigé — remboursement commercial
`POST /api/commercial/remboursement` renvoyait `{ok:true}` SANS RIEN ÉCRIRE : insert dans une
table `refund_requests` inexistante, puis repli sur `status: 'refund_requested'` (valeur
refusée par le CHECK), erreur jamais testée. Le client recevait une notification promettant
un remboursement dont aucune trace n'existait. Réécrite sur le pattern standard, calquée sur
`/api/client/annuler-cotisation`. `client_id` retiré du schéma (déduit de la cotisation).
Le modal affichait 100% des versements au lieu des 90% réellement enregistrés — corrigé.

### 7. Incidents de session
- **Cache PWA** : la prod paraissait ne pas se mettre à jour ; c'était la PWA installée.
  Réflexe : rechargement forcé ou navigation privée avant de conclure.
- **Build cassé sur main** : un merge est parti malgré un `tsc` en échec (blocs de commandes
  séparés). Désormais : une seule chaîne en `&&` du contrôle jusqu'au push.

## Dettes techniques

### Outillage (nouveau)
- **Next 14.2.5 vulnérable** (CVE-2025-29927, corrigée en 14.2.25) → monter à la dernière
  14.2.x avant la démo. Risque atténué : la sécurité ne repose pas sur le middleware.
- `@typescript-eslint` incompatible avec TS 5.9.3 (faux négatifs possibles).
- `next-pwa` non maintenu depuis 2023 → évaluer `serwist`. `public/sw.js` est VERSIONNÉ alors
  qu'il est régénéré à chaque build → à mettre en .gitignore.
- **GitHub Action `tsc` + `lint` sur chaque push** : aurait bloqué le merge cassé du jour.

### Fonctionnel / données (inchangé)
- /admin/versements : 3 bugs fonctionnels + N+1 ~150 requêtes ; `createClient` local restant.
- ExportButton appelle `/api/admin/versements/export` qui N'EXISTE PAS.
- Dashboard « Total collecté » : select sur toute la table + reduce JS → RPC SUM.
- /admin/cotisations sans pagination ; `.in()` non bornés (casse au-delà de ~500 UUIDs).
- **Chaîne remboursement incomplète** : l'approbation ne passe pas `status: 'cancelled'` ;
  l'étape `refunded` n'existe PAS dans le CHECK de `refund_status`.
- **Deux routes écrivent la même demande** (client + commercial) → risque de dérive, à unifier.
- Pas de FK `cotisations.user_id → profiles.id` (0 cotisation orpheline : ajout possible).
- Échecs d'actions admin silencieux → toasts. Frais 10% en dur. Pas de cache catalogue.
- Race condition amount_paid ; colonne received_by manquante sur payments.
- Page orpheline app/commercial/mes-clients/[clientId]/nouvelle-cotisation (code mort).
- RÉSOLU : le dossier /commercial/clients/ n'existe plus dans le repo.

### Contenu
- CGU et landing parlent d'une « boutique physique à Abidjan » : faux (Daloa). Les CGU
  doivent porter les mentions légales FAMIENWA et être relues par un professionnel.

## Tests EN ATTENTE (rien n'a été testé aujourd'hui)
1. Annulation client → refund_status 'requested', cotisation encore 'active', 2e demande 409.
2. Remboursement commercial (après correctif) → montant = 90% des versements.
3. Approbation / rejet dans /admin/remboursements.
4. Lot 4a : liste, ajout avec photo, modification avec retrait/ajout, fichier HEIC ou > 5 Mo
   refusé, prix délirant refusé.
5. Notification fantôme `82fe37a3-9e7b-42d0-ad20-b5ca0c543098` à supprimer si ce n'est pas fait.
6. Photos manquantes à ajouter (3 « Tassa Dan » + Casserole ronde 6 pièces) et doublons à
   désactiver.

## Infrastructure & décisions en suspens
- Domaine : lamanne.shop puis lamanne.ci envisagé. TRANCHER AVANT l'onboarding GeniusPay
  (webhooks, checkOrigin, CSP, start_url PWA, redirections Auth, réinstallation PWA côté
  utilisateurs). Question ouverte : domaine au nom de FAMIENWA ou de Hokma Labs ?
- Supabase : transfert entre ORGANISATIONS possible depuis le dashboard, conserve URL et clés
  (rien à migrer). Une migration vers un projet neuf changerait le project ref et casserait
  toutes les URLs de photos stockées en base. Faire le transfert AVANT GeniusPay.
- Vercel Hobby : upgrade Pro requis avant d'encaisser (usage commercial). Bloqueur cartes.
- Deployment Protection désactivée ; 30 octobre 2026 : fin des GRANTs auto Supabase.

## Objectif court terme
Démo propre pour M. N'GUESSAN. La démo se fera sur la PROD : remettre la preview obligatoire
avant la démo et avant tout vrai utilisateur.
