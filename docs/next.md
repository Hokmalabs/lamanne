# LAMANNE — Prochaine session (plan)

*Créé le 08 août 2026*

## Objectif : boucler la démo FAMIENWA
Il reste UN portail à refaire (admin) + l'intégration paiement (GeniusPay).

## Priorité 1 — Portail ADMIN (refonte design + audit sécurité)

### Écrans à traiter
- admin-login (page de connexion admin)
- Dashboard admin (KPIs, graphe collectes, cotisations récentes)
- Produits (liste + création/édition + upload image)
- Catégories (CRUD — page /admin/categories jamais codée, à créer)
- Équipe (commerciaux : liste, création, assignation)
- Clients (liste globale, détail)
- Cotisations (liste globale, filtres)
- Versements (/admin/versements — filtres, pagination, KPIs ; dette N+1 connue)
- Retraits (validation des retraits physiques via code)
- Remboursements (demandes de remboursement — refund_status sur cotisations)

### AUDIT SÉCURITÉ INDISPENSABLE (avant le design)
Le portail client s'est révélé cassé (writes directs bloqués par RLS + RPC manquante).
FAIRE LE MÊME AUDIT sur l'admin AVANT de polir :
  grep -rn "supabase.from(" app/admin components --include="*.tsx" | grep -iE "insert|update|delete|upsert"
  grep -rn "Math.random" app/admin --include="*.tsx"
  grep -rn "\.rpc(" app/api/admin --include="*.ts"   (vérifier que les RPC appelées existent)
Si des writes directs ou des RPC inexistantes → créer les API/RPC AVANT le design.
Vérifier notamment : validation de retrait (passage à withdrawn_at), remboursements.

### Méthode design (patterns déjà validés à réutiliser)
- Palette : classes lamanne-primary / lamanne-accent, garde #2D9B6F (succès), #FEF3D7 (or pâle).
- Sora sur titres + gros chiffres.
- Mobile-first : min-w-0 + truncate anti-débordement, w-full sm:w-auto sur boutons,
  tableaux → tableau-desktop / cards-mobile.
- Barres progression : classe .progress-bar-fill (dégradé). Anneau : composant ProgressRing.
- Metric cards façon dashboard commercial. Logo : composant <Logo />.
- Modals : items-start sm:items-center + overflow-y-auto + max-h (fix clavier mobile), inputs 16px.
- Podium/médailles et feux tricolores de PERFORMANCE : garder (sémantique), harmoniser sur
  #2D9B6F/#F2A900/#9CA3AF.

## Priorité 2 — GeniusPay
- Clés API reçues (gérant FAMIENWA).
- Aujourd'hui les versements sont payment_method "cash" (record_payment). GeniusPay ajoute le
  paiement EN LIGNE.
- Ne JAMAIS mettre les clés dans le repo : variables d'env Vercel côté serveur, jamais
  NEXT_PUBLIC_. Vérifier .env.local dans .gitignore.
- Intégration probable : nouveau payment_method + webhook de confirmation → appelle
  record_payment côté serveur à réception du paiement confirmé.

## Rappels
- Tester chaque lot sur téléphone réel via preview Vercel avant merge.
- Commits fréquents, une branche par lot, relecture ligne par ligne.
- Docs à re-mettre à jour en fin de session (current.md + architecture.md).
