import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_ROUTES = ["/dashboard", "/catalogue", "/cotisations", "/historique", "/profil"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // ── Client Supabase (lecture cookies de la request) ──────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          // 1. écrire dans la request courante
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. créer une nouvelle réponse avec les cookies rafraîchis
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          );
        },
      },
    }
  );

  // IMPORTANT : aucune logique entre createServerClient et getUser()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Logs debug (à retirer après résolution) ──────────────────
  console.log(`[Middleware] ${pathname} | user: ${user?.id ?? "null"} | error: ${userError?.message ?? "none"}`);

  // ── Protection routes utilisateur ────────────────────────────
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !user) {
    return redirectTo(request, supabaseResponse, `/login?redirectTo=${pathname}`);
  }

  // ── Protection routes admin ──────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      console.log("[Admin middleware] Pas de session → /login");
      return redirectTo(request, supabaseResponse, "/login");
    }

    // Vérifier role='admin' dans la table profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log(`[Admin middleware] user: ${user.id} | role: ${profile?.role ?? "null"} | profileError: ${profileError?.message ?? "none"}`);

    if (profileError) {
      // Erreur RLS ou réseau → on bloque par sécurité
      console.error("[Admin middleware] Erreur lecture profil:", profileError.message);
      return redirectTo(request, supabaseResponse, "/dashboard");
    }

    if (!profile || profile.role !== "admin") {
      console.log(`[Admin middleware] role="${profile?.role}" → pas admin → /dashboard`);
      return redirectTo(request, supabaseResponse, "/dashboard");
    }

    console.log("[Admin middleware] Accès admin autorisé ✓");
  }

  // ── Redirection si déjà connecté sur /login ou /register ─────
  if (user && (pathname === "/login" || pathname === "/register")) {
    return redirectTo(request, supabaseResponse, "/dashboard");
  }

  return supabaseResponse;
}

/**
 * Redirige en copiant les cookies Supabase rafraîchis dans la réponse
 * de redirection, pour éviter de perdre la session.
 */
function redirectTo(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destination: string
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination.split("?")[0];
  url.search = destination.includes("?") ? "?" + destination.split("?")[1] : "";

  const redirectResponse = NextResponse.redirect(url);

  // Copie les cookies Supabase rafraîchis dans la redirection
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      sameSite: cookie.sameSite as "strict" | "lax" | "none" | undefined,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expires: cookie.expires ? new Date(cookie.expires) : undefined,
    });
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
