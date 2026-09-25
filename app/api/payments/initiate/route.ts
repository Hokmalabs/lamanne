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
import { ONLINE_MIN_CREDIT, ONLINE_SERVICE_FEE, onlineCharge } from "@/lib/online-payment";
import { createPayment } from "@/lib/geniuspay";

export const dynamic = "force-dynamic";

const schema = z.object({
  cotisation_id: z.string().uuid("ID de cotisation invalide"),
  amount: z
    .number()
    .int("Montant entier requis")
    .min(ONLINE_MIN_CREDIT, `Le paiement en ligne minimum est de ${ONLINE_MIN_CREDIT} FCFA`),
});

/** Nombre maximal d'intentions de paiement par client et par heure */
const MAX_INTENTS_PER_HOUR = 10;

/**
 * Crée une intention de paiement puis la session de checkout GeniusPay.
 * Aucune écriture dans payments ni cotisations : seul le webhook crédite.
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["user"]);

    if (process.env.ONLINE_PAYMENT_ENABLED !== "true") {
      throw new ApiError(503, "Le paiement en ligne n'est pas encore disponible", "INTERNAL");
    }

    const { cotisation_id, amount } = validateInput(schema, await req.json());

    // Anti-abus : nombre d'intentions créées par ce client depuis 1 heure
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("payment_intents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.user.id)
      .gte("created_at", since);

    if (countError) {
      console.error("[payments/initiate] rate limit count:", countError);
      throw new ApiError(500, "Erreur interne", "INTERNAL");
    }
    if ((count ?? 0) >= MAX_INTENTS_PER_HOUR) {
      throw new ApiError(429, "Trop de tentatives de paiement. Réessayez plus tard.", "FORBIDDEN");
    }

    // Cotisation : doit appartenir au client connecté
    const { data: cot, error: cotError } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status, refund_status, total_price, amount_paid, products(name)")
      .eq("id", cotisation_id)
      .maybeSingle();

    if (cotError) {
      console.error("[payments/initiate] cotisation fetch:", cotError);
      throw new ApiError(500, "Erreur interne", "INTERNAL");
    }
    if (!cot || cot.user_id !== ctx.user.id) {
      throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    }
    if (cot.status !== "active") {
      throw new ApiError(409, "Cette cotisation n'est plus active", "INVALID_INPUT");
    }
    if (cot.refund_status === "requested" || cot.refund_status === "approved") {
      throw new ApiError(409, "Un remboursement est en cours sur cette cotisation", "INVALID_INPUT");
    }

    const reste = (cot.total_price as number) - (cot.amount_paid as number);
    if (reste < ONLINE_MIN_CREDIT) {
      throw new ApiError(
        409,
        `Reste de ${reste} F : à régler en espèces auprès de votre agent`,
        "INVALID_INPUT",
      );
    }
    if (amount > reste) {
      throw new ApiError(400, "Le montant dépasse le reste à payer", "INVALID_INPUT");
    }

    // Intention créée AVANT la redirection
    const merchantRef = `LMN-${crypto.randomUUID()}`;
    const { error: insertError } = await supabaseAdmin.from("payment_intents").insert({
      merchant_ref: merchantRef,
      cotisation_id,
      user_id: ctx.user.id,
      initiated_by: ctx.user.id,
      amount_credit: amount,
      service_fee: ONLINE_SERVICE_FEE,
      amount_charged: onlineCharge(amount),
    });

    if (insertError) {
      console.error("[payments/initiate] intent insert:", insertError);
      throw new ApiError(500, "Erreur interne", "INTERNAL");
    }

    const rawProduct = cot.products as { name: string } | { name: string }[] | null;
    const product = Array.isArray(rawProduct) ? (rawProduct[0] ?? null) : rawProduct;

    const origin = new URL(req.url).origin;
    const returnUrl = `${origin}/paiement/retour?ref=${merchantRef}`;

    let session: { reference: string; paymentUrl: string };
    try {
      session = await createPayment({
        amount: onlineCharge(amount),
        description: `LAMANNE - ${product?.name ?? "Cotisation"}`,
        successUrl: returnUrl,
        errorUrl: returnUrl,
        metadata: { merchant_ref: merchantRef, cotisation_id },
      });
    } catch (e) {
      // Journal sans secret : nom + message de l'erreur uniquement
      console.error(
        "[payments/initiate] createPayment:",
        e instanceof Error ? `${e.name}: ${e.message}` : "erreur inconnue",
      );

      const { error: failError } = await supabaseAdmin
        .from("payment_intents")
        .update({ status: "failed", failure_reason: "init_failed" })
        .eq("merchant_ref", merchantRef);

      if (failError) {
        console.error("[payments/initiate] intent mark failed:", failError);
      }

      throw new ApiError(
        502,
        "Le service de paiement est indisponible. Réessayez ou payez auprès de votre agent.",
        "INTERNAL",
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("payment_intents")
      .update({ provider_ref: session.reference, payment_url: session.paymentUrl })
      .eq("merchant_ref", merchantRef);

    if (updateError) {
      console.error("[payments/initiate] intent update:", updateError);
      throw new ApiError(500, "Erreur interne", "INTERNAL");
    }

    return NextResponse.json({
      ok: true,
      merchant_ref: merchantRef,
      payment_url: session.paymentUrl,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
