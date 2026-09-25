import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  requireAuth,
  requireRole,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  ref: z.string().regex(/^LMN-[0-9a-f-]{36}$/, "Référence invalide"),
});

/**
 * État d'une intention de paiement du client connecté (page de retour).
 * Ne renvoie jamais provider_ref ni payment_url.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  try {
    const ctx = await requireAuth(request);
    requireRole(ctx, ["user"]);
    const { ref } = validateInput(ParamsSchema, await params);

    const { data: intent, error } = await supabaseAdmin
      .from("payment_intents")
      .select("status, amount_credit, service_fee, amount_charged, cotisation_id")
      .eq("merchant_ref", ref)
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (error) {
      console.error("[payments/[ref]] intent fetch:", error);
      throw new ApiError(500, "Erreur interne", "INTERNAL");
    }
    if (!intent) {
      throw new ApiError(404, "Paiement introuvable", "NOT_FOUND");
    }

    return NextResponse.json({
      ok: true,
      status: intent.status,
      amount_credit: intent.amount_credit,
      service_fee: intent.service_fee,
      amount_charged: intent.amount_charged,
      cotisation_id: intent.cotisation_id,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
