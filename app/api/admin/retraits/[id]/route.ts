import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  requireAuth,
  requireRole,
  checkOrigin,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  id: z.string().uuid("ID de cotisation invalide"),
});

/**
 * Deux façons de valider un retrait :
 * - "code" : le client (avec application) donne son code de retrait ;
 * - "identite" : client sans application, présent, numéro vérifié, preuve présentée.
 */
const BodySchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("code"),
    code: z.string().regex(/^\d{6}$/, "Le code comporte 6 chiffres"),
  }),
  z.object({
    method: z.literal("identite"),
    proof: z.enum(["carnet", "piece_identite"]),
    client_present: z.literal(true, { message: "Le client doit être présent" }),
  }),
]);

/** Comparaison à temps constant (longueurs vérifiées avant timingSafeEqual) */
function codesMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const ctx = await requireAuth(request);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);
    const body = validateInput(BodySchema, await request.json());

    // Lire la cotisation pour vérifier l'état avant update
    const { data: cotisation, error: fetchError } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status, withdrawn_at, withdrawal_code, refund_status, products(name)")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[retraits PATCH] fetch:", fetchError);
      throw new ApiError(500, "Erreur de lecture", "INTERNAL");
    }
    if (!cotisation) {
      throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    }

    // Vérification d'état : completed uniquement
    if (cotisation.status !== "completed") {
      throw new ApiError(
        409,
        "Cette cotisation n'est pas prête pour un retrait",
        "INVALID_INPUT",
      );
    }

    // Idempotence : déjà retiré ?
    if (cotisation.withdrawn_at) {
      throw new ApiError(409, "Ce retrait a déjà été validé", "INVALID_INPUT");
    }

    if (cotisation.refund_status === "requested" || cotisation.refund_status === "approved") {
      throw new ApiError(
        409,
        "Un remboursement est en cours sur cette cotisation",
        "INVALID_INPUT",
      );
    }

    // Méthode "code" : le code saisi doit correspondre au code de la cotisation
    if (body.method === "code") {
      const expected = cotisation.withdrawal_code as string | null;
      if (!expected) {
        throw new ApiError(
          409,
          "Aucun code pour cette cotisation : utilisez la vérification d'identité",
          "INVALID_INPUT",
        );
      }
      if (!codesMatch(body.code, expected)) {
        throw new ApiError(400, "Code incorrect", "INVALID_INPUT");
      }
    }

    // Update avec garde IS NULL pour protéger contre les races concurrentes
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cotisations")
      .update({
        withdrawn_at: new Date().toISOString(),
        withdrawn_by: ctx.user.id,
        withdrawal_method: body.method,
        withdrawal_proof: body.method === "identite" ? body.proof : null,
      })
      .eq("id", id)
      .is("withdrawn_at", null)
      .select("id");

    if (updateError) {
      console.error("[retraits PATCH] update:", updateError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    // 0 ligne mise à jour = race gagnée par une autre requête
    if (!updated || updated.length === 0) {
      throw new ApiError(409, "Ce retrait a déjà été validé", "INVALID_INPUT");
    }

    // Notification au client (échec non bloquant)
    const rawProduct = cotisation.products;
    const product = Array.isArray(rawProduct)
      ? ((rawProduct[0] as { name: string } | undefined) ?? null)
      : (rawProduct as { name: string } | null);
    const productName = product?.name ?? "votre article";

    const { error: notifError } = await supabaseAdmin.from("notifications").insert({
      user_id: cotisation.user_id,
      title: "Retrait validé",
      message: `Le retrait de "${productName}" a été validé. Merci de votre confiance.`,
      type: "success",
    });

    if (notifError) {
      console.error("[retraits PATCH] notification insert:", notifError);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
