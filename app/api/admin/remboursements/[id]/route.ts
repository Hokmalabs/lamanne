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

const BodySchema = z.object({
  action: z.enum(["approve", "reject"], {
    message: "Action invalide (approve ou reject attendu)",
  }),
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
    const { action } = validateInput(BodySchema, await request.json());

    const refundStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateError } = await supabaseAdmin
      .from("cotisations")
      .update({ refund_status: refundStatus })
      .eq("id", id);

    if (updateError) {
      console.error("[remboursements PATCH] update:", updateError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    // Notification au client (échec non bloquant)
    const { data: cotisation } = await supabaseAdmin
      .from("cotisations")
      .select("user_id, refund_amount, products(name)")
      .eq("id", id)
      .single();

    if (cotisation) {
      const rawProduct = cotisation.products;
      const product = Array.isArray(rawProduct)
        ? ((rawProduct[0] as { name: string } | undefined) ?? null)
        : (rawProduct as { name: string } | null);
      const productName = product?.name ?? "votre article";

      const notif =
        action === "approve"
          ? {
              user_id: cotisation.user_id,
              title: "Remboursement approuvé",
              message: `Votre remboursement de ${cotisation.refund_amount} FCFA pour "${productName}" a été approuvé.`,
              type: "success",
            }
          : {
              user_id: cotisation.user_id,
              title: "Remboursement refusé",
              message: `Votre demande de remboursement pour "${productName}" a été refusée.`,
              type: "warning",
            };

      await supabaseAdmin.from("notifications").insert(notif);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
