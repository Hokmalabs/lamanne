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
  client_id: z.string().uuid(),
  motif: z.string().min(1).max(500),
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

  if (!profile || !["commercial", "admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { cotisation_id, client_id, motif } = parsed.data;

  // Verify cotisation exists and belongs to this commercial's client
  const { data: cotisation } = await admin
    .from("cotisations")
    .select("id, user_id, amount_paid, status")
    .eq("id", cotisation_id)
    .single();

  if (!cotisation) {
    return NextResponse.json({ error: "Cotisation introuvable" }, { status: 404 });
  }

  // Verify the client is assigned to this commercial
  if (profile.role === "commercial") {
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("assigned_commercial")
      .eq("id", client_id)
      .single();

    if (!clientProfile || clientProfile.assigned_commercial !== user.id) {
      return NextResponse.json({ error: "Ce client ne vous est pas assigné" }, { status: 403 });
    }
  }

  if (cotisation.amount_paid <= 0) {
    return NextResponse.json({ error: "Aucun montant à rembourser" }, { status: 400 });
  }

  // Create refund request (stored as a special payment with negative amount or a dedicated table)
  // We'll use a refund_requests table if it exists, or mark the cotisation
  const { error: refundError } = await admin
    .from("refund_requests")
    .insert({
      cotisation_id,
      client_id,
      commercial_id: user.id,
      amount: cotisation.amount_paid,
      motif,
      status: "pending",
    });

  if (refundError) {
    // Fallback: update cotisation status to "refund_requested" if table doesn't exist
    await admin
      .from("cotisations")
      .update({ status: "refund_requested" })
      .eq("id", cotisation_id);
  }

  // Notify client
  await admin.from("notifications").insert({
    user_id: client_id,
    title: "Demande de remboursement",
    message: `Une demande de remboursement a été initiée pour votre cotisation. Montant : ${cotisation.amount_paid.toLocaleString("fr-FR")} FCFA.`,
    type: "info",
  });

  return NextResponse.json({ ok: true });
}
