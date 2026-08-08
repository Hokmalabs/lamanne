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
  amount: z.number().int("Montant entier requis").min(1000, "Le montant minimum est de 1000 FCFA"),
  idempotency_key: z.string().min(1, "Clé d'idempotence requise"),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["user", "commercial", "admin", "super_admin"]);
    const { cotisation_id, amount, idempotency_key } = validateInput(
      schema,
      await req.json(),
    );

    // Contrôle de propriété : le user ne peut verser que sur SA PROPRE cotisation
    const { data: cot } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status")
      .eq("id", cotisation_id)
      .single();

    if (!cot) throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    if (cot.user_id !== ctx.user.id) throw new ApiError(403, "Accès refusé", "FORBIDDEN");
    if (cot.status !== "active") throw new ApiError(409, "Cotisation non active", "INVALID_INPUT");

    const { data, error } = await supabaseAdmin.rpc("record_payment", {
      p_cotisation_id: cotisation_id,
      p_amount: amount,
      p_recorded_by: ctx.user.id,
      p_role: "user",
      p_idempotency_key: idempotency_key,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("COTISATION_NON_ACTIVE")) throw new ApiError(409, "Cotisation non active", "INVALID_INPUT");
      if (msg.includes("MONTANT_DEPASSE_RESTE")) throw new ApiError(400, "Le versement dépasse le montant restant", "INVALID_INPUT");
      if (msg.includes("MONTANT_INVALIDE")) throw new ApiError(400, "Montant invalide", "INVALID_INPUT");
      if (msg.includes("COTISATION_INTROUVABLE")) throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
      console.error("[ClientVersement] rpc:", error);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return handleApiError(e);
  }
}
