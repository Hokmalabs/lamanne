# LAMANNE — Architecture technique

*Mise à jour : 22 septembre 2026*

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

## Storage

Bucket `products` (photos produits) :
- Limite : 5 MB par fichier
- MIME whitelist : `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Policies : SELECT public, INSERT/UPDATE/DELETE réservés à admin/super_admin

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
- **`requirePageAuth` absent des 3 pages produits** (ce sont des Client Components) → encapsuler dans un server wrapper.
- **Approbation de remboursement** : ne passe pas la cotisation en `status = 'cancelled'`.
- **Échecs d'actions admin silencieux** → remplacer par des toasts.
- **Frais de remboursement 10% en dur** dans le code → à externaliser (config ou table paramètres).
- **Pas de cache** sur catalogue produits (`unstable_cache` à ajouter).
- **Pas d'observabilité** : Sentry, Vercel Spend alerts, Uptime Robot à installer avant lancement réel.
- **Race condition amount_paid** non patchée (besoin RPC, différée volume faible).
- **Colonne received_by manquante** sur payments (commercial inféré via `cotisations.created_by`).
- **Code mort** sous `/commercial/clients/` (dossier v0 non supprimé, cause bugs de navigation).

**Résolus récemment** : N+1 du dashboard, `/admin/remboursements`, `/admin/retraits` et `/admin/cotisations` (pattern Map, voir « Relations & jointures PostgREST »).

## Alertes calendrier

- **30 octobre 2026** : Supabase supprime les GRANTs auto pour nouvelles tables `public`. Toute nouvelle table doit avoir des GRANTs explicites en SQL. Tables existantes non affectées.