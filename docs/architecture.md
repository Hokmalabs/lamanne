# LAMANNE — Architecture technique

## Stack

- **Framework** : Next.js 14/15 App Router
- **Langage** : TypeScript strict
- **UI** : Tailwind CSS + shadcn/ui + lucide-react
- **Backend** : Supabase (PostgreSQL managé, Auth, Storage, Realtime)
- **Validation** : Zod v4.3.6 (locale français officiel via `lib/zod-fr.ts`)
- **Hébergement** : Vercel plan Hobby (URL `lamanne.vercel.app`)
- **Repo** : GitHub `Hokmalabs/lamanne`

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

### Pages server components sensibles

Commencent TOUJOURS par :

```typescript
export default async function XxxPage() {
  await requirePageAuth(["admin", "super_admin"]);
  // ... suite
}
```

Puis utilisent `supabaseAdmin` (service_role) pour les lectures. **Pas de RLS côté serveur.**

## RLS actuelles

- **profiles** : `user_select_own_profile` (SELECT `auth.uid() = id`)
- **cotisations** : `user_select_own_cotisations` (SELECT `auth.uid() = user_id`)
- **payments** : `user_select_own_payments` (SELECT `auth.uid() = user_id`)
- **notifications** : `user_select_own_notifications` (SELECT `auth.uid() = user_id`) + `user_update_own_notifications` (UPDATE `auth.uid() = user_id`)
- **categories** : lecture publique (`true`)
- **products** : lectures publique + writes réservés à admin/super_admin

Aucune policy INSERT/UPDATE/DELETE pour les users : les writes passent obligatoirement par les API routes via `supabaseAdmin`.

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

**`.in()` avec plus de 500 UUIDs** : URL PostgREST dépasse 16KB et est rejetée silencieusement (data:[] sans erreur). Utiliser une RPC Postgres pour les JOINs côté serveur.

## Dette technique connue

- **N+1 sur `/admin/versements`** : ~150 requêtes par chargement pour 50 versements. À optimiser avec RPC Postgres quand le volume augmentera.
- **Pas de cache** sur catalogue produits (`unstable_cache` à ajouter).
- **Pas d'observabilité** : Sentry, Vercel Spend alerts, Uptime Robot à installer avant lancement réel.
- **Race condition amount_paid** non patchée (besoin RPC, différée volume faible).
- **Colonne received_by manquante** sur payments (commercial inféré via `cotisations.created_by`).
- **Code mort** sous `/commercial/clients/` (dossier v0 non supprimé, cause bugs de navigation).

## Alertes calendrier

- **30 octobre 2026** : Supabase supprime les GRANTs auto pour nouvelles tables `public`. Toute nouvelle table doit avoir des GRANTs explicites en SQL. Tables existantes non affectées.