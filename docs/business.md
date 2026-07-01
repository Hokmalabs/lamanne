# LAMANNE — Contexte métier

## Le client final : ETS FAMIENWA SERVICES

- Raison sociale : ETS FAMIENWA SERVICES
- Forme juridique : SARL
- N° RCCM : CI-DAL-2024-B-12.586
- Immatriculée le 14 mars 2024 à Daloa
- Capital : 1 000 000 FCFA
- Siège social : Daloa, Quartier Kirmann, 200 m du CHR, BP 90 Daloa
- Gérant : M. N'GUESSAN Kouamé Félix
- Contact gérant : +225 07 57 59 13 55

L'entreprise formalise en 2024 une dynamique commerciale familiale antérieure, basée sur la collecte de cotisations communautaires pour l'accès aux biens du quotidien.

## Modèle économique

**Tontine inversée** : le client paie AVANT de recevoir son article.

1. Client choisit un article dans le catalogue
2. Client s'engage sur une durée (min_tranches à max_tranches en mois selon le produit)
3. Client verse par tranches régulières (cash à l'agent, ou en ligne via GeniusPay)
4. Une fois 100% payé → génération d'un code de retrait unique
5. Client récupère l'article (livraison à domicile par l'agent, pas de boutique fixe)

**Ce n'est PAS du crédit à la consommation** (pas de BNPL type Molo Molo Paye). Aucun risque de crédit pour l'entreprise : le client reçoit après paiement complet.

## Segments

- Articles ménagers, cuisine, ustensiles
- Petit électroménager
- Appareils électroniques (téléphones, ordinateurs, TV)
- Meubles & décoration
- Matériel scolaire
- Beauté & soins
- Vêtements & accessoires
- Divers quotidien

Ticket moyen : 15 000 – 50 000 FCFA. Clientèle 100–500 récurrents (initialement).

## Les 4 rôles

### super_admin
- Un seul (Joel Yemian, dev Hokma Labs)
- Accès secret via `/hokma-admin`
- Toutes permissions
- Peut créer des admins

### admin
- Le gérant FAMIENWA (M. N'GUESSAN)
- Créé par le super_admin
- Gère : produits, catégories, équipe (commerciaux), clients, cotisations, versements, retraits, remboursements
- N'a PAS accès à la partie super_admin

### commercial (agent terrain)
- Créé par un admin
- Se voit assigner des clients spécifiques (`profiles.assigned_commercial = commercial.id`)
- Peut : créer des clients, créer des cotisations pour SES clients, enregistrer des versements cash, demander des remboursements pour SES clients
- Ne voit QUE ses clients assignés (pas ceux des autres commerciaux)
- Rémunéré à la commission (pas d'employé formel)

### user (client final)
- S'inscrit par téléphone (compte créé par un agent ou en self-service)
- Voit son catalogue, ses cotisations, ses paiements, ses notifications
- Reçoit un code de retrait quand une cotisation est complète
- Peut demander l'annulation d'une cotisation (remboursement)

## Flow métier — Création d'une cotisation par un commercial

Deux flows possibles selon le contexte de la vente.

### Flow A — Vente depuis le catalogue (client rencontré en tournée)

Contexte : le commercial est en tournée, un client s'intéresse à un article vu chez un autre client ou dans un catalogue papier/téléphone.

1. Commercial ouvre `/commercial/catalogue`
2. Cherche/scrolle jusqu'à l'article
3. Clic sur l'article → `/commercial/catalogue/{productId}` (page détail)
4. Clic sur "Créer une cotisation"
5. Modal "Pour quel client ?" liste les clients affiliés au commercial
6. Clic sur un client → écran de confirmation avec récapitulatif :
   - Produit sélectionné
   - Client sélectionné
   - Choix de la durée (entre min_tranches et max_tranches du produit)
7. Clic "Confirmer" → POST `/api/commercial/nouvelle-cotisation`
8. Succès → retour à `/commercial/catalogue/{productId}` (permet d'enchaîner d'autres ventes)

### Flow B — Vente structurée depuis un client existant

Contexte : le commercial rend visite planifiée à un client et propose un nouvel article.

1. Commercial ouvre `/commercial/mes-clients`
2. Cherche/clic sur le client
3. Arrive sur `/commercial/mes-clients/{clientId}` (profil client avec cotisations en cours)
4. Clic sur "Nouvelle cotisation"
5. Modal/écran de sélection produit (catalogue filtré)
6. Clic sur un produit → écran de confirmation avec récapitulatif (idem flow A)
7. Clic "Confirmer" → POST `/api/commercial/nouvelle-cotisation`
8. Succès → retour à `/commercial/mes-clients/{clientId}` (voit sa nouvelle cotisation)

### API cible partagée par les deux flows

`POST /api/commercial/nouvelle-cotisation`
Body : `{ product_id: uuid, client_id: uuid, months: number }`
Vérifications serveur :
- `checkOrigin` + `requireAuth` + `requireRole(["commercial","admin","super_admin"])`
- Le commercial doit être assigné au client (`profiles.assigned_commercial === ctx.user.id`)
- Le produit doit exister et être actif
- `months` doit être entre `product.min_tranches` et `product.max_tranches`

## Étape de confirmation obligatoire

**Toujours un récapitulatif avant création finale** de la cotisation. En tournée, un doigt qui glisse peut créer une mauvaise cotisation. Le récap affiche :
- Nom du client
- Article
- Prix total
- Durée choisie (en mois)
- Montant approximatif par mois

Boutons "Annuler" et "Confirmer la cotisation".

## Convention de nommage

Le dossier `/commercial/clients/` est **obsolète** (v0 du code). Le seul dossier à utiliser côté commercial est `/commercial/mes-clients/`. Toute route sous `/commercial/clients/` doit être considérée comme code mort à supprimer.