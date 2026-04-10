import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Uses service role to create user with email_confirm: true — bypasses email sending entirely
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(6),
  pin: z.string().length(4).regex(/^\d{4}$/),
  role: z.enum(["user", "commercial", "admin"]).default("user"),
  assigned_commercial: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { full_name, phone, pin, role, assigned_commercial } = parsed.data;
  const cleanPhone = phone.replace(/\s/g, "").replace(/^00/, "+");
  const digits = cleanPhone.replace(/\D/g, "");
  const email = `phone_${digits}@lamanne.app`;

  // Check if already exists
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Ce numéro est déjà enregistré. Veuillez vous connecter." },
      { status: 409 }
    );
  }

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: pin + "LM",
    email_confirm: true, // ← bypasses email confirmation entirely
    user_metadata: { full_name, phone: cleanPhone },
  });

  if (createError) {
    // User already exists in auth but not in profiles
    if (createError.message.includes("already been registered")) {
      return NextResponse.json(
        { error: "Ce numéro est déjà enregistré. Veuillez vous connecter." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  if (newUser?.user) {
    await admin.from("profiles").upsert({
      id: newUser.user.id,
      full_name,
      phone: cleanPhone,
      role,
      ...(assigned_commercial ? { assigned_commercial } : {}),
    });
  }

  return NextResponse.json({ ok: true });
}
