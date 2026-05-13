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

const CreateSchema = z
  .object({
    name: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(200)
      .trim(),
    description: z.string().max(2000).optional().default(""),
    price: z.number().int().positive("Le prix doit être un entier positif"),
    category_id: z.string().uuid("Catégorie invalide"),
    stock: z.number().int().nonnegative("Le stock ne peut pas être négatif"),
    is_lot: z.boolean().optional().default(false),
    lot_details: z.string().max(2000).nullable().optional(),
    min_tranches: z.number().int().min(1).max(12).optional().default(1),
    max_tranches: z.number().int().min(1).max(12).optional().default(6),
    delivery_days: z.number().int().min(1).max(60).optional().default(1),
    images: z.array(z.string().url()).max(4).optional().default([]),
    is_active: z.boolean().optional().default(true),
  })
  .refine((data) => data.min_tranches <= data.max_tranches, {
    message: "La durée minimum ne peut excéder la durée maximum",
    path: ["min_tranches"],
  });

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const ctx = await requireAuth(request);
    requireRole(ctx, ["admin", "super_admin"]);
    const body = validateInput(CreateSchema, await request.json());

    const lotDetails = body.is_lot ? (body.lot_details ?? null) : null;

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name: body.name,
        description: body.description,
        price: body.price,
        category_id: body.category_id,
        stock: body.stock,
        is_lot: body.is_lot,
        lot_details: lotDetails,
        min_tranches: body.min_tranches,
        max_tranches: body.max_tranches,
        delivery_days: body.delivery_days,
        images: body.images,
        is_active: body.is_active,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[produits POST] insert:", error);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return handleApiError(e);
  }
}
