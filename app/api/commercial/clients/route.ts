import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["commercial", "admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", user.id)
    .order("full_name");

  return NextResponse.json({ clients: clients ?? [] });
}
