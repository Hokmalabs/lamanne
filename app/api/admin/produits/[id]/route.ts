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

const ParamsSchema = z.object({
  id: z.string().uuid("ID de produit invalide"),
});

const UpdateSchema = z
  .object({
    name: z.string().min(2).max(200).trim().optional(),
    description: z.string().max(2000).optional(),
    price: z.number().int().positive().optional(),
    category_id: z.string().uuid().optional(),
    stock: z.number().int().nonnegative().optional(),
    is_lot: z.boolean().optional(),
    lot_details: z.string().max(2000).nullable().optional(),
    min_tranches: z.number().int().min(1).max(12).optional(),
    max_tranches: z.number().int().min(1).max(12).optional(),
    delivery_days: z.number().int().min(1).max(60).optional(),
    images: z.array(z.string().url()).max(4).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ à modifier requis",
  })
  .refine(
    (data) => {
      if (
        data.min_tranches !== undefined &&
        data.max_tranches !== undefined
      ) {
        return data.min_tranches <= data.max_tranches;
      }
      return true;
    },
    {
      message: "La durée minimum ne peut excéder la durée maximum",
      path: ["min_tranches"],
    },
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const ctx = await requireAuth(request);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);
    const body = validateInput(UpdateSchema, await request.json());

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = body.price
    if (body.category_id !== undefined) updateData.category_id = body.category_id
    if (body.stock !== undefined) updateData.stock = body.stock
    if (body.is_lot !== undefined) {
      updateData.is_lot = body.is_lot
      // Cohérence métier : si is_lot devient false, on vide lot_details
      updateData.lot_details = body.is_lot ? (body.lot_details ?? null) : null
    } else if (body.lot_details !== undefined) {
      // is_lot non modifié, lot_details modifié seul → on l'applique tel quel
      updateData.lot_details = body.lot_details
    }
    if (body.min_tranches !== undefined) updateData.min_tranches = body.min_tranches
    if (body.max_tranches !== undefined) updateData.max_tranches = body.max_tranches
    if (body.delivery_days !== undefined) updateData.delivery_days = body.delivery_days
    if (body.images !== undefined) updateData.images = body.images
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { error } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[produits PATCH] update:", error);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const ctx = await requireAuth(request);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);

    // Bloquer si des cotisations actives ou en remboursement sont liées
    const { count, error: countError } = await supabaseAdmin
      .from("cotisations")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id)
      .in("status", ["active", "refund_requested"]);

    if (countError) {
      console.error("[produits DELETE] count check:", countError);
      throw new ApiError(500, "Erreur de vérification", "INTERNAL");
    }

    if ((count ?? 0) > 0) {
      throw new ApiError(
        409,
        `Suppression impossible : ${count} cotisation(s) active(s) liée(s) à ce produit. Désactivez-le plutôt.`,
        "INVALID_INPUT",
      );
    }

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[produits DELETE] delete:", error);
      throw new ApiError(500, "Erreur de suppression", "INTERNAL");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
