import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  member_id: z.string().uuid(),
  action: z.enum(["suspend", "reactivate", "delete"]),
});

export async function POST(req: NextRequest) {
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

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "Accès réservé au super admin" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { member_id, action } = parsed.data;

  if (member_id === user.id) {
    return NextResponse.json({ error: "Impossible d'agir sur votre propre compte" }, { status: 400 });
  }

  if (action === "delete") {
    // Delete from auth (profile deleted via cascade or explicit delete)
    const { error: authErr } = await admin.auth.admin.deleteUser(member_id);
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }
    // Explicit profile delete in case cascade isn't set
    await admin.from("profiles").delete().eq("id", member_id);
    revalidatePath("/admin/equipe");
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_suspended: action === "suspend" })
    .eq("id", member_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/admin/equipe");
  return NextResponse.json({ ok: true });
}
