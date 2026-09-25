# architecture.md — ajouts du 24 septembre 2026

À intégrer dans docs/architecture.md (remplacer les passages marqués « REMPLACE »).

## RPC Postgres (REMPLACE la liste implicite)

Toutes : SECURITY INVOKER sauf mention, `set search_path = public`,
`revoke execute ... from public, anon, authenticated` + `grant execute ... to service_role`.
Contrôle : `select p.oid::regprocedure, p.prosecdef, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';`
→ aucune ligne ne doit contenir `anon=X` ni `authenticated=X` (fonctions de trigger comprises).

- `record_payment(p_cotisation_id, p_amount, p_recorded_by, p_idempotency_key) → json`
  Versement cash. Verrou `for update` sur la cotisation AVANT le contrôle d'idempotence.
  Clé déjà connue : même cotisation et même montant → `idempotent: true` ; sinon
  `CLE_IDEMPOTENCE_REUTILISEE`. Refus : COTISATION_NON_ACTIVE, REMBOURSEMENT_EN_COURS
  (requested ou approved), MONTANT_INVALIDE, MONTANT_DEPASSE_RESTE (sur total_price - amount_paid).
  Soldé → status completed + code de retrait (gen_random_uuid, boucle anti-collision).
  Renvoie { idempotent, new_status, withdrawal_code, amount_paid, amount_remaining, just_completed }.
- `create_cotisation_with_payment(p_user_id, p_product_id, p_months, p_first_payment,
  p_created_by, p_idempotency_key) → json`
  `pg_advisory_xact_lock(hashtext(clé))`, idempotence par `cotisations.creation_key`.
  Rejeu → { idempotent: true, cotisation_id, amount_paid, new_status }.
  Premier versement (> 0) via record_payment avec la clé `<clé>:premier`.
- `pin_attempt_begin`, `pin_attempt_success` (voir Authentification).

Minimum métier des versements cash (lib/versement.ts, MIN_VERSEMENT_CASH = 1 000) : vérifié
dans les routes, avec l'exception « montant = reste exact » (solde final).

## Idempotence côté écrans

Une clé (crypto.randomUUID, `newIdempotencyKey()`) = UNE opération logique. Elle est créée à
l'ouverture du formulaire et régénérée UNIQUEMENT après un succès ou une réponse 409. Renvoyer
la même saisie après une coupure réseau → le serveur répond « déjà enregistré », jamais de
doublon. Ne jamais régénérer la clé sur changement de montant ou réouverture.

## Écrans agent et RLS

La RLS n'autorise que le propriétaire (`auth.uid() = user_id`). Un agent ne peut donc RIEN lire
des données de ses clients depuis le navigateur : toute donnée client affichée à un agent est
chargée côté serveur (supabaseAdmin, après vérification de l'assignation) ou via une route API.

## Retraits (état au 24/09 — à corriger en P1c)

La route PATCH /api/admin/retraits/[id] ne vérifie aucun code ; la page affiche le code.
Cible P1c : code saisi par l'admin et comparé côté serveur, OU vérification d'identité tracée
(withdrawn_by, withdrawal_method, withdrawal_proof). L'agent ne voit jamais le code de retrait.

## Paiement en ligne — GeniusPay (conception validée, non codée)

Retour terrain de l'intégration SumiAfrica (18/09/2026), qui PRIME sur la doc GeniusPay :
- Base https://geniuspay.ci/api/v1/merchant (la doc écrit http:// : à ignorer).
  En-têtes X-API-Key + X-API-Secret, côté serveur uniquement (la clé « publique » authentifie :
  jamais dans le navigateur). Pas de SDK geniuspay-react.
- POST /payments sans payment_method = checkout hébergé ; URL dans data.payment_url OU
  data.checkout_url. Minimum 200 XOF. Notre merchant_ref dans metadata ; leur reference
  (MTX-...) stockée dans payment_intents.provider_ref.
- GET /payments/{reference} : re-vérification serveur à serveur obligatoire avant crédit.
- Webhook : en-têtes x-webhook-signature, x-webhook-timestamp (secondes), x-webhook-event.
  Signature = HMAC-SHA256(`${timestamp}.${rawBody}`, secret) en hex. Corps lu avec req.text().
  Comparer les longueurs avant timingSafeEqual. Idempotence sur l'`id` de l'événement.
  `environment` absent des vrais événements : ne rejeter que s'il est présent ET différent.
  Montants en chaînes décimales ("200.00") : parser et arrondir.
  Structure : { id, event, timestamp, data: { reference, amount, status, currency, net_amount,
  fees: { total_fees, gateway_fees, platform_fees }, customer, metadata, payment_method } }.
  Toujours répondre 200 (résultat réel tracé en base) : une réponse différenciée permet
  d'énumérer les références. Retentatives jusqu'à 5 fois sur 6 h, réponse attendue < 10 s.
  Le payload contient le téléphone du payeur : retirer `customer` avant stockage.
- Frais : 1 % + 100 XOF + opérateur, prélevés sur le solde marchand (le montant du webhook =
  montant demandé). Stocker fees et net_amount.
- Pas d'API de reversement : tout remboursement est manuel.
- En local, Node peut échouer à joindre geniuspay.ci (TLS) : tester sur Vercel.

Modèle :
- `payment_intents` : merchant_ref (unique, à nous), provider_ref (unique), cotisation_id,
  user_id, initiated_by, amount_credit (≥ 200, ≤ reste), service_fee (100, stocké par intention),
  amount_charged (= crédit + frais, envoyé à GeniusPay, comparé en égalité stricte),
  status (pending | success | failed | expired), fees, net_amount, gateway, dates.
- `webhook_events` : event_id (unique), merchant_ref, signature_valid, payload sans customer,
  outcome (credited | duplicate | amount_mismatch | unknown_ref | invalid_signature).
- `payments.intent_id` (unique) pour les versements en ligne.
- RPC `confirm_online_payment` : update conditionnel `status = 'pending'` → 'success', puis
  insert payments (online) + incrément amount_paid dans la même transaction ; trop-perçu
  crédité et signalé (amount_remaining ramené à 0) ; code de retrait si soldé.
- Page de retour : ne crédite jamais ; interroge NOTRE base (polling borné : 3 s, 60 s max).
- Réconciliation : cron (Vercel Pro) sur les intentions pending > 15 min, expiration > 24 h.

## Build local (Windows)

`export NODE_OPTIONS=--max-old-space-size=4096`, `rm -rf .next` avant tsc (les types générés
d'une autre branche faussent la vérification), `npx next build --no-lint` (le lint est déjà fait
par la chaîne), navigateur fermé pendant le build.

# LAMANNE — Architecture technique

*Mise à jour : 23 septembre 2026*

## Stack

- **Framework** : Next.js 14/15 App Router
- **Langage** : TypeScript strict
- **UI** : Tailwind CSS + shadcn/ui + lucide-react
- **Backend** : Supabase (PostgreSQL managé, Auth, Storage, Realtime)
- **Validation** : Zod v4.3.6 (locale français officiel via `lib/zod-fr.ts`)
- **Hébergement** : Vercel plan Hobby (URL `lamanne.vercel.app`)
- **Repo** : GitHub `Hokmalabs/lamanne`

## Palette & tokens

Tokens `lamanne.*` définis dans `tailwind.config.ts` :

| Token | Hex | Usage |
|---|---|---|
| `lamanne.primary` | `#0F5132` | Vert profond — identité, boutons pleins |
| `lamanne.accent` | `#F2A900` | Jaune — accents, mises en avant |
| `lamanne.light` | `#FFFAF2` | Fond crème général |
| `lamanne.success` | `#2D9B6F` | Statuts positifs |
| `lamanne.warning` | `#F5A623` | Statuts en attente |
| `lamanne.soft` | `#FEF3D7` | Fonds doux (avatars, badges) |
| `lamanne.danger` | `#E53935` | Erreurs, statuts négatifs |

**Règles d'usage :**

- **Aucun hex en dur** dans les composants — toujours passer par les tokens Tailwind.
- **Bouton plein = `primary`** (contraste AA garanti). `accent` ne sert pas de fond de bouton plein.
- **`success` réservé aux fonds et textes de statut**, pas aux actions.
- **`soft`** pour les avatars et badges.
- **Fond sombre de navigation = `bg-gray-900`**.
- **`font-sora`** sur les titres et les gros chiffres (KPIs, montants).
- **`.progress-bar-fill`** pour les barres de progression.
- **Composant `ProgressRing`** pour les anneaux de progression.

## Modèle de sécurité — Defense in depth

**4 couches de contrôle** pour chaque opération sensible :

1. **Layout guard** (`app/{role}/layout.tsx`) — première vérification de rôle
2. **Page guard** (`requirePageAuth` en tête de chaque server component sensible) — deuxième vérification
3. **API guard** (`checkOrigin + requireAuth + requireRole + validateInput`) — dans chaque route handler
4. **RLS Postgres** — dernière ligne de défense côté DB

Toutes les écritures sensibles passent par le service_role (côté serveur uniquement), qui bypass les RLS. Les RLS servent à empêcher les fuites via anon key en cas d'accès direct depuis le navigateur.

## Authentification

**Trois modes** :

- **Équipe** (admin, commercial) : mot de passe fort via `signInWithPassword`, avec l'email technique `phone_225…@lamanne.app` (onglet Téléphone) ou un email réel (onglet Email).
- **super_admin** : par email via `/hokma-admin` (alias de `/admin-login`).
- **Clients** : numéro + PIN via `POST /api/auth/phone-login`.

**PIN clients** :

- Table `public.auth_pins` : `user_id`, `pin_hash` (`scrypt$N$r$p$sel$hash`), `must_change`, `temp_expires_at`, `failed_attempts`, `locked_until`. RLS activée **sans policy**, grants `service_role` seulement.
- RPC `pin_attempt_begin` (réserve l'essai **avant** la vérification) et `pin_attempt_success`, `execute` révoqué pour `public` / `anon` / `authenticated`.
- Session client ouverte **côté serveur** : `lib/phone-session.ts` (`generateLink` magiclink + `verifyOtp` `token_hash`) — uniquement depuis une route API.

**Modules** :

- `lib/phone.ts` — normalisation des numéros et email technique.
- `lib/pin-rules.ts` — règles de format et de robustesse du PIN (module pur, utilisable dans le navigateur).
- `lib/pin.ts` — hachage et vérification (serveur uniquement).
- `lib/client-accounts.ts` — **SEUL** point de création d'un compte client.
- `lib/staff-password.ts` — mot de passe de l'équipe.
- `lib/equipe-guards.ts` — gardes des routes équipe.
- `components/SecretRevealDialog.tsx` — pour tout secret affiché une seule fois.

**Inscription publique Supabase désactivée** : toute création de compte passe par `auth.admin.createUser` côté serveur. Le trigger `handle_new_user` crée toujours le profil avec `role = 'user'`.

## Helpers centraux

### `lib/api-security.ts`

- `requireAuth(req)` — valide session Supabase, charge le profil, throw ApiError 401 si non authentifié
- `requireRole(ctx, allowed[])` — throw ApiError 403 si rôle non autorisé
- `requirePageAuth(allowed[])` — équivalent pour server components, avec `redirect()` au lieu de throw
- `validateInput(schema, data)` — Zod safeParse avec messages français
- `checkOrigin(req)` — anti-CSRF basique sur mutations, autorise `lamanne.vercel.app` + localhost + Vercel preview
- `handleApiError(e)` — convertit ApiError en NextResponse JSON structurée

### `lib/api-client.ts`

Helpers côté client pour appeler les API routes :
- `apiGet`, `apiPost`, `apiPatch`, `apiDelete`
- Gère les erreurs 4xx/5xx via `ApiClientError`
- Gère les 204 No Content

### `lib/zod-fr.ts`

Configure Zod globalement en français via `z.config(fr())` (locale officiel v4).

### `lib/supabase-admin.ts`

Singleton `supabaseAdmin` (service_role) réutilisé dans toutes les API routes.

### `lib/supabase.ts`

Client Supabase côté browser (anon key). Utilisé uniquement pour SELECT via RLS + Realtime, jamais pour writes.

## Structure des routes

### API routes (`app/api/**`)

Toutes suivent le pattern :

```typescript
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["role1", "role2"]);
    const body = validateInput(schema, await req.json());
    // ... logique métier avec supabaseAdmin
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
```

#### Routes client (`app/api/client/**`)

- **`/api/client/nouvelle-cotisation`** — création d'une cotisation (produit + montant cible), rôle `client`.
- **`/api/client/versement`** — enregistrement d'un versement via la RPC Postgres `record_payment` (atomique : insert `payments` + incrément `cotisations.amount_paid`).
- **`/api/client/annuler-cotisation`** — **demande** de remboursement. Écrit :
  - `refund_status = 'requested'`
  - `refund_amount = floor(amount_paid * 0.9)` — **calculé côté serveur** (frais 10% retenus), jamais transmis par le client
  - `refund_requested_at`
  - `cancellation_reason`

  La cotisation **reste `active`** : l'annulation effective se fait à l'approbation admin. Garde anti-doublon tolérante aux valeurs `NULL` / `'none'` de `refund_status`.

#### Routes commercial (`app/api/commercial/**`)

- **`/api/commercial/remboursement`** — demande de remboursement initiée par l'agent pour SON client. Écrit les mêmes champs que `/api/client/annuler-cotisation` : `refund_status = 'requested'`, `refund_amount = floor(amount_paid * 0.9)` **calculé serveur**, `refund_requested_at`, `cancellation_reason`. La cotisation **reste `active`**.
  Le `client_id` n'est **JAMAIS** accepté depuis le navigateur : le propriétaire est déduit de `cotisations.user_id`, et l'assignation (`profiles.assigned_commercial`) est vérifiée serveur quand le rôle est `commercial`.

### Pages server components sensibles

Commencent TOUJOURS par :

```typescript
export default async function XxxPage() {
  await requirePageAuth(["admin", "super_admin"]);
  // ... suite
}
```

Puis utilisent `supabaseAdmin` (service_role) pour les lectures. **Pas de RLS côté serveur.**

Toutes les pages admin server importent le **singleton** `supabaseAdmin` de `lib/supabase-admin.ts`. Les `createClient(...)` locaux ont été supprimés partout, **sauf `/admin/versements`** (à traiter au lot data, avec le passage en RPC).

## RLS actuelles

- **profiles** : `user_select_own_profile` (SELECT `auth.uid() = id`)
- **cotisations** : `user_select_own_cotisations` (SELECT `auth.uid() = user_id`)
- **payments** : `user_select_own_payments` (SELECT `auth.uid() = user_id`)
- **notifications** : `user_select_own_notifications` (SELECT `auth.uid() = user_id`) + `user_update_own_notifications` (UPDATE `auth.uid() = user_id`)
- **categories** : lecture publique (`true`)
- **products** : lectures publique + writes réservés à admin/super_admin

Aucune policy INSERT/UPDATE/DELETE pour les users : les writes passent obligatoirement par les API routes via `supabaseAdmin`.

## Relations & jointures PostgREST

`cotisations.user_id` et `profiles.id` référencent **tous les deux** `auth.users(id)`. Il n'existe donc **aucune FK directe `cotisations` → `profiles`**, et PostgREST refuse l'embed :

```typescript
// Erreur PGRST200 : could not find a relationship
.select("*, profiles(full_name, phone)")
```

**Pattern standard** (dashboard, `/admin/cotisations`, `/admin/remboursements`, `/admin/retraits`) :

1. Une requête sur `cotisations` avec embed `products(...)` — autorisé (FK réelle).
2. Collecte des `user_id` → **une seule** requête `profiles` via `.in("id", userIds)`.
3. Résolution via une `Map`, plus un helper `pickOne` qui normalise la relation embarquée (PostgREST renvoie tantôt un objet, tantôt un tableau).

```typescript
const byId = new Map(profiles.map((p) => [p.id, p]));
const profile = byId.get(cotisation.user_id);
const product = pickOne(cotisation.products);
```

**Limite** : `.in()` au-delà de ~500 UUIDs casse **silencieusement** (URL PostgREST > 16KB, retourne `data: []` sans erreur) → paginer les lots ou basculer sur une RPC.

**Évolution envisagée** : ajouter une FK `cotisations.user_id` → `profiles.id` pour rendre les embeds possibles et supprimer ce pattern.

## Intégrité référentielle

Script `supabase/fk-restrict.sql`, appliqué le **22 septembre 2026** :

- `cotisations.product_id` → `products(id)` : **ON DELETE RESTRICT**
- `cotisations.user_id` → `auth.users(id)` : **ON DELETE RESTRICT**
- `payments.user_id` → `auth.users(id)` : **ON DELETE RESTRICT**
- `payments.cotisation_id` → `cotisations(id)` : **ON DELETE CASCADE** (inchangé — les versements n'ont pas de sens sans leur cotisation)

**Règle** : on **désactive** un produit (`is_active = false`) et on **suspend** un compte (`is_suspended = true`), on ne supprime jamais. Une suppression qui violerait une FK remonte l'erreur Postgres `23503`, que les routes doivent traduire en 409 explicite.

## RPC Postgres

Toute nouvelle fonction créée dans le schéma `public` doit être verrouillée explicitement :

```sql
revoke execute on function public.ma_fonction(...) from public, anon, authenticated;
grant  execute on function public.ma_fonction(...) to service_role;
```

Sans ce verrouillage, la fonction est **appelable avec la clé anon depuis le navigateur**, ce qui contourne tout le modèle de sécurité (les RPC s'exécutent côté DB, hors des gardes des API routes). À appliquer dès la création, au même titre que les GRANTs de tables (voir « Alertes calendrier »).

## Storage

Bucket `products` (photos produits) :
- Limite : 5 MB par fichier
- MIME whitelist : `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Policies : SELECT public, INSERT/UPDATE/DELETE réservés à admin/super_admin

### Upload produits

L'upload depuis le navigateur est **autorisé** pour ce bucket (les policies le réservent déjà à admin/super_admin) — c'est la seule exception à la règle « aucune écriture directe depuis le client ». Contraintes :

- **Chemin** = `crypto.randomUUID()` + extension, jamais le nom du fichier d'origine.
- **Extension déduite du type MIME** (`image/jpeg` → `jpg`, `png`, `webp`, `gif`), jamais de l'extension fournie par l'utilisateur.
- **`upsert: false`** et **`contentType` explicite** à l'upload.
- **Upload après validation** du formulaire, et **nettoyage best effort** (`storage.remove(paths)`) si un upload suivant ou l'appel API échoue — pas de fichier orphelin en cas d'échec.
- Côté API, les URLs reçues sont **restreintes au préfixe public du bucket** `products` (`${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`) : toute autre URL est rejetée.
- Les photos retirées d'un produit existant sortent du tableau `images` mais ne sont pas supprimées du Storage (nettoyage serveur à prévoir).

## Headers HTTP

Voir `next.config.js` :
- Content-Security-Policy (Supabase wildcard, Google Fonts, Unsplash, data:/blob:)
- Strict-Transport-Security (2y + subdomains + preload)
- X-DNS-Prefetch-Control (on)
- X-Frame-Options (DENY)
- X-Content-Type-Options (nosniff)
- Referrer-Policy (strict-origin-when-cross-origin)
- Permissions-Policy (camera=(), microphone=(), geolocation=())

## Pattern à éviter

**setInterval côté client sur Server Components** : `router.refresh()` dans un `setInterval` provoque des re-fetches complets à chaque tick = énorme consommation CPU Vercel. Utiliser Realtime Supabase si push nécessaire, ou polling > 5 min si vraiment besoin.

**Queries Supabase dans le middleware par requête** : trop coûteux à l'échelle. Préférer un cookie signé HMAC-SHA256 avec TTL 5 min si besoin d'un check middleware.

**Calcul métier sensible côté navigateur** : tout montant à valeur financière (ex. montant de remboursement = 90% des versements) doit être calculé **côté serveur** à partir des données DB, jamais reçu du client.

**Agrégat en JS sur une table complète** : `select` sans filtre suivi d'un `reduce` côté Node charge toute la table en mémoire et grossit linéairement. Utiliser une **RPC Postgres** (`SUM`, `COUNT`, `GROUP BY`).

**Repli silencieux sur erreur DB** : une route qui rattrape une erreur d'écriture sans la tester (ou qui enchaîne sur un second write non vérifié) et renvoie quand même `{ ok: true }` **ment à l'utilisateur** — l'action semble réussie alors que rien n'a été écrit. Cas réel : `/api/commercial/remboursement` insérait dans une table inexistante puis basculait sur un statut refusé par le CHECK, le tout sans jamais tester l'erreur (corrigé le 23 septembre 2026). Toute erreur DB doit produire une `ApiError`.

**`.in()` avec plus de 500 UUIDs** : URL PostgREST dépasse 16KB et est rejetée silencieusement (data:[] sans erreur). Utiliser une RPC Postgres pour les JOINs côté serveur.

## Dette technique connue

- **`/admin/versements`** : N+1 (~150 requêtes par chargement pour 50 versements) **+ 3 bugs fonctionnels** :
  1. le filtre commercial est appliqué **après** la pagination (résultats manquants) ;
  2. la recherche mélange filtrage SQL et filtrage JS de façon incohérente ;
  3. les KPIs sont calculés sur la page de 50 lignes, pas sur l'ensemble.

  → à refondre en **RPC Postgres** (lot data).
- **Dashboard "Total collecté"** : `select` sur toute la table `payments` + `reduce` JS → à remplacer par une **RPC `SUM`**.
- **`/admin/cotisations`** : aucune pagination, et `.in()` non bornés (cotisations + clients) → casse silencieusement au-delà de ~500 UUIDs.
- **`ExportButton`** appelle `/api/admin/versements/export`, route **inexistante**.
- **Approbation de remboursement** : ne passe pas la cotisation en `status = 'cancelled'`.
- **Échecs d'actions admin silencieux** → remplacer par des toasts.
- **Frais de remboursement 10% en dur** dans le code → à externaliser (config ou table paramètres).
- **Pas de cache** sur catalogue produits (`unstable_cache` à ajouter).
- **Pas d'observabilité** : Sentry, Vercel Spend alerts, Uptime Robot à installer avant lancement réel.
- **Race condition amount_paid** non patchée (besoin RPC, différée volume faible).
- **Colonne received_by manquante** sur payments (commercial inféré via `cotisations.created_by`).
- **Next 14.2.5 vulnérable** : montée de version à planifier.
- **`@typescript-eslint` incompatible avec TS 5.9.3** (avertissement au lint).
- **`next-pwa` non maintenu** : remplacement à étudier.
- **`public/sw.js` versionné à tort** : c'est un artefact de build, il doit sortir du repo.

**Résolus récemment** : N+1 du dashboard, `/admin/remboursements`, `/admin/retraits` et `/admin/cotisations` (pattern Map, voir « Relations & jointures PostgREST »).

## Alertes calendrier

- **30 octobre 2026** : Supabase supprime les GRANTs auto pour nouvelles tables `public`. Toute nouvelle table doit avoir des GRANTs explicites en SQL. Tables existantes non affectées.