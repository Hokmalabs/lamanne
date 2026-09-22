import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const schema = z.object({
  cotisation_id: z.string().uuid("Cotisation invalide"),
  reason: z.string().max(500, "Motif trop long (500 caractères maximum)").optional(),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["user", "commercial", "admin", "super_admin"]);
    const { cotisation_id, reason } = validateInput(schema, await req.json());

    // Contrôle de propriété : le user ne peut annuler que SA PROPRE cotisation
    const { data: cot } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status, amount_paid, refund_status")
      .eq("id", cotisation_id)
      .single();

    if (!cot) throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    if (cot.user_id !== ctx.user.id) throw new ApiError(403, "Accès refusé", "FORBIDDEN");
    if (cot.status !== "active") throw new ApiError(409, "Cotisation non active", "INVALID_INPUT");
    if (cot.refund_status && cot.refund_status !== "none") {
      throw new ApiError(409, "Une demande de remboursement est déjà en cours", "INVALID_INPUT");
    }

    // Montant calculé côté serveur uniquement (jamais fourni par le client)
    const refundAmount = Math.floor(cot.amount_paid * 0.9);

    const { error } = await supabaseAdmin
      .from("cotisations")
      .update({
        refund_status: "requested",
        refund_requested_at: new Date().toISOString(),
        refund_amount: refundAmount,
        cancellation_reason: reason ?? null,
      })
      .eq("id", cotisation_id);

    if (error) {
      console.error("[ClientAnnulerCotisation] update:", error);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    // Notification au client (échec non bloquant)
    await supabaseAdmin.from("notifications").insert({
      user_id: cot.user_id,
      title: "Demande de remboursement envoyée",
      message:
        "Votre demande d'annulation a été transmise. Un administrateur la traitera prochainement.",
      type: "info",
    });

    return NextResponse.json({ ok: true, refund_amount: refundAmount });
  } catch (e) {
    return handleApiError(e);
  }
}
