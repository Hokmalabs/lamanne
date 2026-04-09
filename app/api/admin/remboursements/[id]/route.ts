import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Vérifier que l'appelant est admin
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = await request.json();
  const refundStatus = action === "approve" ? "approved" : "rejected";

  const { error } = await supabaseAdmin
    .from("cotisations")
    .update({ refund_status: refundStatus })
    .eq("id", params.id);

  if (error) {
    console.error("[API remboursements] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notification à l'utilisateur
  const { data: cotisation } = await supabaseAdmin
    .from("cotisations")
    .select("user_id, refund_amount, products(name)")
    .eq("id", params.id)
    .single();

  if (cotisation) {
    const productName = (cotisation.products as any)?.name ?? "votre article";
    await supabaseAdmin.from("notifications").insert({
      user_id: cotisation.user_id,
      title: action === "approve" ? "Remboursement approuvé" : "Remboursement refusé",
      message: action === "approve"
        ? `Votre remboursement de ${cotisation.refund_amount} FCFA pour "${productName}" a été approuvé.`
        : `Votre demande de remboursement pour "${productName}" a été refusée.`,
      type: action === "approve" ? "success" : "warning",
    });
  }

  return NextResponse.json({ success: true });
}
