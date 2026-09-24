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

const MAX_COTISATIONS_SANS_VERSEMENT = 3;

const schema = z.object({
  product_id: z.string().uuid("Identifiant produit invalide"),
  months: z
    .number()
    .int("La durée doit être un nombre entier de mois")
    .min(1, "Durée invalide"),
});

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    // Seul un client crée une cotisation pour lui-même
    // (agents et admins : /api/commercial/nouvelle-cotisation)
    requireRole(ctx, ["user"]);
    const { product_id, months } = validateInput(schema, await req.json());

    // Récupérer le produit et vérifier qu'il est actif
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("price, min_tranches, max_tranches, is_active")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      throw new ApiError(404, "Produit introuvable", "NOT_FOUND");
    }

    if (!product.is_active) {
      throw new ApiError(409, "Produit indisponible", "INVALID_INPUT");
    }

    if (months < product.min_tranches || months > product.max_tranches) {
      throw new ApiError(
        400,
        `La durée doit être comprise entre ${product.min_tranches} et ${product.max_tranches} mois`,
        "INVALID_INPUT",
      );
    }

    // Garde-fou : limiter les cotisations actives sans aucun versement
    const { count, error: countError } = await supabaseAdmin
      .from("cotisations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user.id)
      .eq("status", "active")
      .eq("amount_paid", 0);

    if (countError) {
      console.error("[ClientNouvelleCotisation] count:", countError);
      throw new ApiError(500, "Erreur de vérification", "INTERNAL");
    }

    if ((count ?? 0) >= MAX_COTISATIONS_SANS_VERSEMENT) {
      throw new ApiError(
        409,
        "Vous avez déjà 3 cotisations sans versement. Effectuez un versement auprès de votre agent avant d'en créer une nouvelle.",
        "INVALID_INPUT",
      );
    }

    const now = new Date().toISOString();
    const deadline = addMonths(now, months);

    // Créer la cotisation à 0 F payé — les versements passent par l'agent
    const { data: cotisation, error: cotError } = await supabaseAdmin
      .from("cotisations")
      .insert({
        user_id: ctx.user.id,
        product_id,
        total_price: product.price,
        amount_paid: 0,
        amount_remaining: product.price,
        nb_tranches: 0,
        tranche_amount: Math.ceil(product.price / months),
        status: "active",
        deadline,
        created_by: ctx.user.id,
      })
      .select("id")
      .single();

    if (cotError || !cotisation) {
      console.error("[ClientNouvelleCotisation] cotisation insert:", cotError);
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }

    return NextResponse.json({ ok: true, cotisation_id: cotisation.id });
  } catch (e) {
    return handleApiError(e);
  }
}
