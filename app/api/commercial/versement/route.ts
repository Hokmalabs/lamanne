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
    console.error("[Versement] Validation error:", parsed.error.flatten());
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { cotisation_id, amount } = parsed.data;

  // Fetch cotisation with all needed fields
  const { data: cot, error: cotFetchError } = await admin
    .from("cotisations")
    .select("id, user_id, amount_paid, amount_remaining, nb_tranches, status, products(price)")
    .eq("id", cotisation_id)
    .single();

  if (cotFetchError || !cot) {
    console.error("[Versement] Cotisation fetch error:", cotFetchError);
    return NextResponse.json({ error: "Cotisation introuvable" }, { status: 404 });
  }

  if (cot.status !== "active") {
    return NextResponse.json({ error: "Cotisation non active" }, { status: 400 });
  }

  const price = (cot.products as any)?.price ?? 0;
  const newAmountPaid = cot.amount_paid + amount;
  const newAmountRemaining = Math.max(0, (cot.amount_remaining ?? price - cot.amount_paid) - amount);
  const newNbTranches = (cot.nb_tranches ?? 1) + 1;

  if (amount > (cot.amount_remaining ?? price - cot.amount_paid)) {
    return NextResponse.json({ error: "Le versement dépasse le montant restant" }, { status: 400 });
  }

  const isFull = newAmountRemaining <= 0;
  const withdrawalCode = isFull
    ? Math.random().toString().slice(2, 8)
    : undefined;

  // 1. Insert payment (with all required fields)
  const { error: paymentError } = await admin
    .from("payments")
    .insert({
      cotisation_id,
      user_id: cot.user_id,
      amount,
      status: "success",
      payment_method: "cash",
      transaction_ref: `CASH-${Date.now()}`,
      paid_at: new Date().toISOString(),
    });

  if (paymentError) {
    console.error("[Versement] Payment insert error:", paymentError);
    return NextResponse.json({ error: `Erreur enregistrement paiement: ${paymentError.message}` }, { status: 500 });
  }

  // 2. Update cotisation
  const { error: updateError } = await admin
    .from("cotisations")
    .update({
      amount_paid: newAmountPaid,
      amount_remaining: newAmountRemaining,
      nb_tranches: newNbTranches,
      status: isFull ? "completed" : "active",
      ...(withdrawalCode ? { withdrawal_code: withdrawalCode } : {}),
    })
    .eq("id", cotisation_id);

  if (updateError) {
    console.error("[Versement] Cotisation update error:", updateError);
    return NextResponse.json({ error: `Erreur mise à jour cotisation: ${updateError.message}` }, { status: 500 });
  }

  // 3. Notify client
  const notif = isFull
    ? {
        user_id: cot.user_id,
        title: "Cotisation complète !",
        message: `Félicitations ! Votre cotisation est entièrement payée. Code de retrait : ${withdrawalCode}. Vous pouvez maintenant demander le retrait de votre article.`,
        type: "success",
      }
    : {
        user_id: cot.user_id,
        title: "Versement enregistré",
        message: `Un versement de ${amount.toLocaleString("fr-FR")} FCFA a été enregistré. Reste : ${newAmountRemaining.toLocaleString("fr-FR")} FCFA.`,
        type: "info",
      };

  await admin.from("notifications").insert(notif);

  return NextResponse.json({ ok: true, completed: isFull });
}
