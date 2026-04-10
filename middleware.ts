import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_ROUTES = ["/dashboard", "/catalogue", "/cotisations", "/historique", "/profil", "/admin", "/commercial"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : aucune logique entre createServerClient et getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protection : redirige vers /login si non connecté
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !user) {
    return redirectTo(request, supabaseResponse, `/login?redirectTo=${pathname}`);
  }

  // Redirection si déjà connecté sur /login ou /register
  if (user && (pathname === "/login" || pathname === "/register")) {
    return redirectTo(request, supabaseResponse, "/dashboard");
  }

  return supabaseResponse;
}

function redirectTo(
  request: NextRequest,
  supabaseResponse: NextResponse,
  destination: string
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination.split("?")[0];
  url.search = destination.includes("?") ? "?" + destination.split("?")[1] : "";

  const redirectResponse = NextResponse.redirect(url);

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
