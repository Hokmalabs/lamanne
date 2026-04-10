import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  role: z.enum(["admin", "commercial"]),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { full_name, phone, email, role, pin } = parsed.data;
  const cleanPhone = phone.replace(/\s/g, "").replace(/^00/, "+");
  const digits = cleanPhone.replace(/\D/g, "");
  const resolvedEmail = email || `phone_${digits}@lamanne.ci`;

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: resolvedEmail,
    password: pin + "LM",
    email_confirm: true,
    user_metadata: { full_name, phone: cleanPhone },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (newUser?.user) {
    await admin.from("profiles").upsert({
      id: newUser.user.id,
      full_name,
      phone: cleanPhone,
      role,
      created_by: user.id,
    });
  }

  return NextResponse.json({ ok: true });
}
