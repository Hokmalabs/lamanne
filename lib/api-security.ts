/**
 * Helper centralisé de sécurité pour les API routes LAMANNE.
 *
 * Usage type dans une route handler :
 *
 *   export async function POST(req: Request) {
 *     try {
 *       checkOrigin(req)
 *       const ctx = await requireAuth(req)
 *       requireRole(ctx, ["admin", "super_admin"])
 *       const body = validateInput(MonSchema, await req.json())
 *       // ... logique métier
 *       return NextResponse.json({ ok: true })
 *     } catch (e) { return handleApiError(e) }
 *   }
 */

import { z } from "zod"
import { NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase-admin"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "user" | "commercial" | "admin" | "super_admin"

export type AuthContext = {
  user: { id: string; email?: string | null }
  profile: {
    id: string
    role: Role
    is_suspended: boolean
    assigned_commercial: string | null
  }
}

// ---------------------------------------------------------------------------
// Erreur structurée
// ---------------------------------------------------------------------------

/** Codes d'erreur possibles renvoyés au client */
export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "SUSPENDED"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN_ORIGIN"
  | "INTERNAL"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: ApiErrorCode,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ---------------------------------------------------------------------------
// requireAuth — vérifie la session et charge le profil
// ---------------------------------------------------------------------------

/**
 * Valide la session Supabase de la requête entrante et charge le profil
 * de l'utilisateur depuis la base via le client service-role.
 * Lance ApiError 401 si non authentifié ou profil manquant.
 * Lance ApiError 403 si le compte est suspendu.
 */
export async function requireAuth(_request: Request): Promise<AuthContext> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
              setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Ignoré — peut échouer dans certains contextes Route Handler
        }
      },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new ApiError(401, "Non authentifié", "UNAUTHENTICATED")
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_suspended, assigned_commercial")
    .eq("id", user.id)
    .single()

  if (!profile) {
    throw new ApiError(401, "Profil introuvable", "UNAUTHENTICATED")
  }

  if (profile.is_suspended) {
    throw new ApiError(403, "Compte suspendu", "SUSPENDED")
  }

  return {
    user: { id: user.id, email: user.email },
    profile: {
      id: profile.id,
      role: profile.role as Role,
      is_suspended: profile.is_suspended as boolean,
      assigned_commercial: profile.assigned_commercial as string | null,
    },
  }
}

// ---------------------------------------------------------------------------
// requireRole — vérifie le rôle dans le contexte auth
// ---------------------------------------------------------------------------

/**
 * Vérifie que le rôle du profil est dans la liste autorisée.
 * Lance ApiError 403 sinon.
 */
export function requireRole(ctx: AuthContext, allowed: Role[]): void {
  if (!allowed.includes(ctx.profile.role)) {
    throw new ApiError(403, "Accès non autorisé", "FORBIDDEN")
  }
}

// ---------------------------------------------------------------------------
// validateInput — validation Zod avec erreur structurée
// ---------------------------------------------------------------------------

/**
 * Valide `data` contre le schéma Zod fourni.
 * Lance ApiError 400 avec le détail des erreurs en cas d'échec.
 */
export function validateInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join(", ")
    throw new ApiError(400, `Données invalides : ${details}`, "INVALID_INPUT")
  }
  return parsed.data
}

// ---------------------------------------------------------------------------
// checkOrigin — protection CSRF basique sur les mutations
// ---------------------------------------------------------------------------

/** Origines autorisées à appeler les routes de mutation (POST/PATCH/DELETE) */
const ALLOWED_ORIGINS: string[] = [
  "https://lamanne.vercel.app",
  "http://localhost:3000",
]

if (process.env.VERCEL_URL) {
  ALLOWED_ORIGINS.push(`https://${process.env.VERCEL_URL}`)
}

/**
 * Vérifie que l'en-tête `origin` de la requête est dans la liste autorisée.
 * À appeler uniquement sur les méthodes mutantes (POST, PATCH, DELETE).
 * Lance ApiError 403 si l'origine est absente ou non autorisée.
 */
export function checkOrigin(request: Request): void {
  const origin = request.headers.get("origin")
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    throw new ApiError(403, "Origine non autorisée", "FORBIDDEN_ORIGIN")
  }
}

// ---------------------------------------------------------------------------
// handleApiError — convertit une erreur en NextResponse
// ---------------------------------------------------------------------------

/**
 * Convertit une erreur capturée en réponse JSON structurée.
 * Les erreurs inconnues sont loguées côté serveur mais le message brut
 * n'est jamais transmis au client.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    )
  }

  console.error("[API_ERROR]", error)
  return NextResponse.json(
    { error: "Erreur interne", code: "INTERNAL" as ApiErrorCode },
    { status: 500 },
  )
}
