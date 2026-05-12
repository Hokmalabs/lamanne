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

const schema = z.object({
  cotisation_id: z.string().uuid("ID de cotisation invalide"),
  amount: z.number().int().min(1000, "Le montant minimum est de 1000 FCFA"),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { cotisation_id, amount } = validateInput(schema, await req.json());

    // Récupérer la cotisation
    const { data: cot, error: cotFetchError } = await supabaseAdmin
      .from("cotisations")
      .select(
        "id, user_id, amount_paid, amount_remaining, nb_tranches, status, products(price)",
      )
      .eq("id", cotisation_id)
      .single();

    if (cotFetchError || !cot) {
      throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    }

    if (cot.status !== "active") {
      throw new ApiError(409, "Cotisation non active", "INVALID_INPUT");
    }

    // Vérification d'autorisation : le commercial doit être assigné au client
    const role = ctx.profile.role;
    const userId = ctx.user.id;
    const isAdmin = role === "admin" || role === "super_admin";

    if (!isAdmin) {
      const { data: clientProfile } = await supabaseAdmin
        .from("profiles")
        .select("assigned_commercial")
        .eq("id", cot.user_id)
        .single();

      const isAssignedCommercial =
        role === "commercial" &&
        clientProfile?.assigned_commercial === userId;

      if (!isAssignedCommercial) {
        throw new ApiError(
          403,
          "Vous n'êtes pas autorisé à encaisser pour ce client",
          "FORBIDDEN",
        );
      }
    }

    // Calcul des montants
    const productData = cot.products as
      | { price: number }
      | { price: number }[]
      | null;
    const product = Array.isArray(productData)
      ? (productData[0] ?? null)
      : productData;
    const price = product?.price ?? 0;

    const currentRemaining =
      cot.amount_remaining ?? price - cot.amount_paid;

    if (amount > currentRemaining) {
      throw new ApiError(
        400,
        "Le versement dépasse le montant restant",
        "INVALID_INPUT",
      );
    }

    const newAmountPaid = cot.amount_paid + amount;
    const newAmountRemaining = Math.max(0, currentRemaining - amount);
    const newNbTranches = (cot.nb_tranches ?? 0) + 1;
    const isFull = newAmountRemaining <= 0;
    const withdrawalCode = isFull
      ? randomInt(100000, 1000000).toString()
      : undefined;

    // 1. Enregistrer le paiement
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      cotisation_id,
      user_id: cot.user_id,
      amount,
      status: "success",
      payment_method: "cash",
      transaction_ref: `CASH-${Date.now()}`,
      paid_at: new Date().toISOString(),
    });

    if (paymentError) {
      console.error("[Versement] payment insert:", paymentError);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    // 2. Mettre à jour la cotisation
    const { error: updateError } = await supabaseAdmin
      .from("cotisations")
      .update({
        amount_paid: newAmountPaid,
        amount_remaining: newAmountRemaining,
        nb_tranches: newNbTranches,
        status: isFull ? "completed" : "active",
        ...(withdrawalCode ? { withdrawal_code: withdrawalCode } : {}),
      })
      .eq("id", cotisation_id);

    if (updateError) {
      console.error("[Versement] cotisation update:", updateError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    // 3. Notifier le client (échec non bloquant)
    const notif = isFull
      ? {
          user_id: cot.user_id,
          title: "Cotisation complète !",
          message: `Félicitations ! Votre cotisation est entièrement payée. Code de retrait : ${withdrawalCode}. Vous pouvez maintenant demander le retrait de votre article.`,
          type: "success",
        }
      : {
          user_id: cot.user_id,
          title: "Versement enregistré",
          message: `Un versement de ${amount.toLocaleString("fr-FR")} FCFA a été enregistré. Reste : ${newAmountRemaining.toLocaleString("fr-FR")} FCFA.`,
          type: "info",
        };

    await supabaseAdmin.from("notifications").insert(notif);

    return NextResponse.json({ ok: true, completed: isFull });
  } catch (e) {
    return handleApiError(e);
  }
}
