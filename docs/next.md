# LAMANNE — Prochaine session (plan)

*Mis à jour le 22 septembre 2026 — Supabase de nouveau disponible (plan Pro)*

## Objectif : valider tout ce qui a été fait à l'aveugle, puis attaquer le lot data

## Priorité 0 — Vérifications (AVANT tout nouveau code)

### Git
- `git status` + `git log --oneline --all -12` : confirmer que `design/admin-lot3a` est commité et poussé,
  et que le commit « carte Clients » est bien sur `design/admin-lot2b`.
- Vérifier que le bug de classe du lot 1 est corrigé :
  `grep -n "gap-0.5px-2" app/admin/AdminBottomNav.tsx` → doit être VIDE.

### Supabase (SQL editor)
- Projet réactivé, données intactes (compter cotisations / payments / profiles).
- Défaut réel de `cotisations.refund_status` (NULL ou 'none') + répartition des valeurs existantes.
  La garde de /api/client/annuler-cotisation tolère les deux, mais on veut savoir.

### Tests sur preview Vercel (téléphone réel)
1. `fix/client-annulation-api` : demande d'annulation depuis un compte client →
   refund_status = 'requested', cotisation toujours 'active', notification reçue,
   demande visible dans /admin/remboursements, 2e demande refusée (409).
2. `design/admin-lot3a` (contient les 4 lots admin) : nav mobile (5 onglets réguliers, drawer
   « Plus »), dashboard (héros, 4 cartes de couleurs distinctes), clients, équipe, remboursements
   (approuver / rejeter), retraits (valider, onglets), cotisations (filtres, barres).
   Points visuels à juger : bordure `lamanne-accent/40` des retraits en attente assez visible ?
   lisibilité du texte vert `lamanne-success` sur blanc ?
3. Merge : `fix/client-annulation-api` puis `design/admin-lot3a` dans main.

## Priorité 1 — Lot data / RPC (débloqué par Supabase)
Regrouper tous les besoins SQL en un seul chantier, GRANTs explicites sur tout nouvel objet.
- **RPC stats dashboard** : total collecté, compteurs, séries temporelles → puis graphe de collecte
  sur le dashboard (décidé : graphe ajouté seulement une fois la RPC en place).
- **RPC listing versements** : filtres (période, méthode, statut, commercial via
  cotisations.created_by, recherche nom/tél/ref) + pagination + KPIs sur la sélection COMPLÈTE.
  Corrige les 3 bugs fonctionnels + le N+1. Ensuite refonte design de /admin/versements.
- **API export CSV** `/api/admin/versements/export` (mêmes filtres que la RPC ; échapper les cellules
  commençant par = + - @ contre l'injection CSV ; plafond de lignes).
- **Pagination /admin/cotisations** (et bornage des `.in()` sur cotisations / clients).
- **FK `cotisations.user_id → profiles.id`** : évaluer (profiles.id = auth.users.id) ; vérifier que
  tout user_id a un profil avant d'ajouter la contrainte.
- **Chaîne remboursement** : à l'approbation admin → `status: 'cancelled'` (+ cancelled_at) ;
  définir l'étape `refunded` (qui la déclenche, quand l'argent est rendu). Décision produit à prendre.

## Priorité 2 — Lot 4 : produits + catégories
- 3 pages produits (liste, nouveau, modifier — ~890 lignes, Client Components) : design +
  server wrapper `page.tsx` avec `requirePageAuth` rendant le composant client.
- `/admin/categories` : page + API CRUD (Zod, pattern standard) — jamais codée.

## Priorité 3
- admin-login (design).
- Toasts (remplacer les échecs silencieux côté admin).

## Priorité 4 — GeniusPay (NE PAS ATTAQUER sans feu vert explicite de Joel)
Clés + API agrégateur disponibles. Clés en variables d'env Vercel serveur uniquement (jamais
NEXT_PUBLIC_). Nouveau payment_method + webhook signé → record_payment côté serveur.

## Rappels
- Branche par lot ; les lots design s'empilent.
- Tester chaque lot sur téléphone réel via preview Vercel avant merge.
- Mettre à jour current.md + architecture.md + next.md en fin de session.