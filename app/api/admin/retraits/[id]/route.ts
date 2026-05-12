import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  requireAuth,
  requireRole,
  checkOrigin,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

const ParamsSchema = z.object({
  id: z.string().uuid("ID de cotisation invalide"),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const ctx = await requireAuth(request);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);

    // Lire la cotisation pour vérifier l'état avant update
    const { data: cotisation, error: fetchError } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status, withdrawn_at, products(name)")
      .eq("id", id)
      .single();

    if (fetchError || !cotisation) {
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

    // Update avec garde IS NULL pour protéger contre les races concurrentes
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cotisations")
      .update({ withdrawn_at: new Date().toISOString() })
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

    await supabaseAdmin.from("notifications").insert({
      user_id: cotisation.user_id,
      title: "Retrait validé",
      message: `Le retrait de "${productName}" a été validé. Merci de votre confiance.`,
      type: "success",
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
