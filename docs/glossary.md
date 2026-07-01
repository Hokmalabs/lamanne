# LAMANNE — Glossaire métier

Vocabulaire strict à respecter dans le code, l'UI et les communications.

## Cotisation

Contrat d'achat progressif entre un client et FAMIENWA. Chaque cotisation :
- Porte sur UN produit précis
- A un prix total (`total_price`) fixé à la création
- A une durée en mois (`nb_tranches`) fixée à la création (entre `min_tranches` et `max_tranches` du produit)
- A un statut : `active`, `completed`, `cancelled`, `refund_requested`, `refunded`
- Est associée à un client (`user_id`) et créée par un commercial ou admin (`created_by`)
- Génère un `withdrawal_code` unique dès qu'elle atteint 100%

Une même personne peut avoir plusieurs cotisations en parallèle.

## Versement

Un paiement individuel effectué sur une cotisation. Chaque versement :
- Appartient à UNE cotisation (`cotisation_id`)
- A un montant (`amount`)
- Est effectué par un moyen de paiement (`payment_method` : `cash` ou `online`)
- A un statut (`status` : `success`, `pending`, `failed`)
- Est horodaté (`paid_at`) et enregistré (`created_at`)

Un versement cash est enregistré par un commercial ou admin. Un versement online sera enregistré via webhook GeniusPay (à venir).

## Retrait

Récupération physique de l'article par le client une fois la cotisation à 100%. Nécessite le `withdrawal_code`. Enregistré par admin/super_admin via `/admin/retraits`. Marque la cotisation avec `withdrawn_at` (timestamp).

## Remboursement

Demande d'annulation d'une cotisation en cours + restitution des sommes déjà versées. Initié par le client ou son commercial. Validé/refusé par un admin/super_admin. Passe la cotisation en `refund_status = 'requested'` puis `refunded`.

## Code de retrait

Nombre à 6 chiffres généré par `crypto.randomInt(100000, 1000000)` (CSPRNG). Créé automatiquement quand une cotisation atteint 100%. Le client le voit dans ses notifications. Le commercial ou l'admin le vérifie au moment de la remise physique de l'article.

## Rôles

- **super_admin** — le développeur (Joel/Hokma Labs), un seul, accès secret
- **admin** — le gérant FAMIENWA (M. N'GUESSAN), peut être plusieurs à terme
- **commercial** — agent terrain rémunéré à la commission, démarche et collecte
- **user** — client final qui cotise pour ses achats

## Assignation

Chaque client (`user`) peut être assigné à un commercial via `profiles.assigned_commercial`. Un commercial ne peut voir/agir que sur SES clients assignés. Les admins voient tout.

## Types de produits

- **Produit simple** : un article unique (ex : réfrigérateur)
- **Lot** (`is_lot = true`) : ensemble de plusieurs articles vendu comme un tout (ex : batterie de cuisine 12 pièces). Le détail est stocké dans `lot_details` (texte multilignes).

## Statuts

### Cotisation
- `active` — en cours de paiement
- `completed` — 100% payée
- `cancelled` — annulée
- Colonnes séparées : `refund_status` (`null`, `requested`, `approved`, `rejected`, `refunded`)

### Paiement
- `success` — validé
- `pending` — en attente (mobile money en cours)
- `failed` — échec

### Profil
- Colonne `is_suspended` (boolean) — désactive l'accès sans supprimer