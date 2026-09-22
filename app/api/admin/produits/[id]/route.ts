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

// Les images doivent provenir du bucket public `products` du projet Supabase
const PRODUCTS_PUBLIC_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`;

const imageUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith(PRODUCTS_PUBLIC_PREFIX),
    "Image non autorisée (doit provenir du stockage LAMANNE)",
  );

const UpdateSchema = z
  .object({
    name: z.string().min(2).max(200).trim().optional(),
    description: z.string().max(2000).optional(),
    price: z
      .number()
      .int()
      .positive()
      .max(100_000_000, "Prix trop élevé (100 000 000 FCFA maximum)")
      .optional(),
    category_id: z.string().uuid().optional(),
    stock: z
      .number()
      .int()
      .nonnegative()
      .max(100_000, "Stock trop élevé")
      .optional(),
    is_lot: z.boolean().optional(),
    lot_details: z.string().max(2000).nullable().optional(),
    min_tranches: z.number().int().min(1).max(12).optional(),
    max_tranches: z.number().int().min(1).max(12).optional(),
    delivery_days: z.number().int().min(1).max(60).optional(),
    images: z.array(imageUrlSchema).max(4).optional(),
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

    // Cohérence min/max quand un seul des deux est envoyé : on compare la
    // valeur reçue à celle déjà en base (le refine du schéma ne couvre que le
    // cas où les deux sont fournis).
    const { data: existing, error: readError } = await supabaseAdmin
      .from("products")
      .select("id, min_tranches, max_tranches")
      .eq("id", id)
      .maybeSingle();

    if (readError) {
      console.error("[produits PATCH] read:", readError);
      throw new ApiError(500, "Erreur de lecture", "INTERNAL");
    }

    if (!existing) {
      throw new ApiError(404, "Produit introuvable", "NOT_FOUND");
    }

    const effectiveMin = body.min_tranches ?? existing.min_tranches ?? 1;
    const effectiveMax = body.max_tranches ?? existing.max_tranches ?? 12;

    if (effectiveMin > effectiveMax) {
      throw new ApiError(
        400,
        "La durée minimum ne peut excéder la durée maximum",
        "INVALID_INPUT",
      );
    }

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

    // La FK cotisations.product_id est en ON DELETE RESTRICT : toute cotisation
    // liée, quel que soit son statut, empêche la suppression.
    const { count, error: countError } = await supabaseAdmin
      .from("cotisations")
      .select("id", { count: "exact", head: true })
      .eq("product_id", id);

    if (countError) {
      console.error("[produits DELETE] count check:", countError);
      throw new ApiError(500, "Erreur de vérification", "INTERNAL");
    }

    const soldMessage = (total: number) =>
      `Ce produit a déjà été vendu (${total} cotisation(s)) : il ne peut pas être supprimé. Désactivez-le plutôt.`;

    if ((count ?? 0) > 0) {
      throw new ApiError(409, soldMessage(count ?? 0), "INVALID_INPUT");
    }

    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[produits DELETE] delete:", error);
      // 23503 = violation de clé étrangère : une cotisation a été créée entre
      // le comptage et la suppression.
      if (error.code === "23503") {
        throw new ApiError(
          409,
          "Ce produit vient d'être vendu : il ne peut plus être supprimé. Désactivez-le plutôt.",
          "INVALID_INPUT",
        );
      }
      throw new ApiError(500, "Erreur de suppression", "INTERNAL");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
