import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const schema = z.object({
  cotisation_id: z.string().uuid(),
  amount: z.number().min(1000),
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

  if (!callerProfile || !["commercial", "admin", "super_admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { cotisation_id, amount } = parsed.data;

  // Get cotisation + product price
  const { data: cot } = await admin
    .from("cotisations")
    .select("id, user_id, amount_paid, status, products(price)")
    .eq("id", cotisation_id)
    .single();

  if (!cot || cot.status !== "active") {
    return NextResponse.json({ error: "Cotisation introuvable ou non active" }, { status: 404 });
  }

  const price = (cot.products as any)?.price ?? 0;
  const newAmountPaid = cot.amount_paid + amount;

  if (amount > price - cot.amount_paid) {
    return NextResponse.json({ error: "Le versement dépasse le montant restant" }, { status: 400 });
  }

  const isFull = newAmountPaid >= price;

  // Update cotisation
  const { error: updateError } = await admin
    .from("cotisations")
    .update({
      amount_paid: newAmountPaid,
      status: isFull ? "completed" : "active",
    })
    .eq("id", cotisation_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record payment
  await admin.from("payments").insert({
    cotisation_id,
    amount,
    paid_at: new Date().toISOString(),
  });

  // Notify client
  if (isFull) {
    await admin.from("notifications").insert({
      user_id: cot.user_id,
      title: "Cotisation complète !",
      message: `Félicitations ! Votre cotisation est entièrement payée. Vous pouvez maintenant demander le retrait de votre article.`,
      type: "success",
    });
  } else {
    await admin.from("notifications").insert({
      user_id: cot.user_id,
      title: "Versement enregistré",
      message: `Un versement de ${amount.toLocaleString("fr-FR")} FCFA a été enregistré sur votre cotisation.`,
      type: "info",
    });
  }

  return NextResponse.json({ ok: true, completed: isFull });
}
