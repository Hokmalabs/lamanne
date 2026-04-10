import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  client_id: z.string().uuid(),
  product_id: z.string().uuid(),
  first_payment: z.number().min(1000),
});

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

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

  if (!profile || !["commercial", "admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { client_id, product_id, first_payment } = parsed.data;

  // Verify product exists and payment is valid
  const { data: product } = await admin
    .from("products")
    .select("price, max_tranches")
    .eq("id", product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  if (first_payment > product.price) {
    return NextResponse.json({ error: "Le versement dépasse le prix du produit" }, { status: 400 });
  }

  // Verify client is assigned to this commercial
  const { data: client } = await admin
    .from("profiles")
    .select("assigned_commercial")
    .eq("id", client_id)
    .single();

  if (!client || (client.assigned_commercial !== user.id && !["admin", "super_admin"].includes(profile.role))) {
    return NextResponse.json({ error: "Ce client ne vous est pas assigné" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const deadline = addMonths(now, product.max_tranches);
  const isFull = first_payment >= product.price;

  // Create cotisation
  const { data: cotisation, error: cotError } = await admin
    .from("cotisations")
    .insert({
      user_id: client_id,
      product_id,
      amount_paid: first_payment,
      nb_tranches: 1,
      tranche_amount: first_payment,
      status: isFull ? "completed" : "active",
      deadline,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (cotError) {
    return NextResponse.json({ error: cotError.message }, { status: 500 });
  }

  // Record first payment
  await admin.from("payments").insert({
    cotisation_id: cotisation.id,
    amount: first_payment,
    paid_at: now,
  });

  // Create notification for client
  await admin.from("notifications").insert({
    user_id: client_id,
    title: "Nouvelle cotisation démarrée",
    message: `Une cotisation a été créée pour vous par votre commercial. Premier versement : ${first_payment.toLocaleString("fr-FR")} FCFA.`,
    type: "info",
  });

  return NextResponse.json({ ok: true, cotisation_id: cotisation.id });
}
