import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomInt } from "crypto";
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
  product_id: z.string().uuid("Identifiant produit invalide"),
  first_payment: z
    .number()
    .int("Le montant doit être un nombre entier")
    .min(1000, "Le versement minimum est de 1 000 FCFA"),
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
    requireRole(ctx, ["user", "commercial", "admin", "super_admin"]);
    const { product_id, first_payment } = validateInput(
      schema,
      await req.json(),
    );

    // Récupérer le produit et vérifier qu'il est actif
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("price, max_tranches, is_active")
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      throw new ApiError(404, "Produit introuvable", "NOT_FOUND");
    }

    if (!product.is_active) {
      throw new ApiError(409, "Produit indisponible", "INVALID_INPUT");
    }

    if (first_payment > product.price) {
      throw new ApiError(
        400,
        "Le versement dépasse le prix du produit",
        "INVALID_INPUT",
      );
    }

    const now = new Date().toISOString();
    const deadline = addMonths(now, product.max_tranches);
    const isFull = first_payment >= product.price;
    const withdrawalCode = isFull ? String(randomInt(100000, 1000000)) : null;

    // 1. Créer la cotisation — pour soi-même, pas de vérif d'assignation
    const { data: cotisation, error: cotError } = await supabaseAdmin
      .from("cotisations")
      .insert({
        user_id: ctx.user.id,
        product_id,
        total_price: product.price,
        amount_paid: first_payment,
        amount_remaining: Math.max(0, product.price - first_payment),
        nb_tranches: 1,
        tranche_amount: first_payment,
        status: isFull ? "completed" : "active",
        deadline,
        created_by: ctx.user.id,
        withdrawal_code: withdrawalCode,
      })
      .select("id")
      .single();

    if (cotError || !cotisation) {
      console.error("[ClientNouvelleCotisation] cotisation insert:", cotError);
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }

    // 2. Enregistrer le premier paiement (non bloquant si échec, on log)
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      cotisation_id: cotisation.id,
      user_id: ctx.user.id,
      amount: first_payment,
      status: "success",
      payment_method: "cash",
      transaction_ref: `CASH-${Date.now()}`,
      paid_at: now,
    });

    if (paymentError) {
      console.error("[ClientNouvelleCotisation] payment insert:", paymentError);
      // Non bloquant : la cotisation a été créée, on continue
    }

    return NextResponse.json({ ok: true, cotisation_id: cotisation.id });
  } catch (e) {
    return handleApiError(e);
  }
}
