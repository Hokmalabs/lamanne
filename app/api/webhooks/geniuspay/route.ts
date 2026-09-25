import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPayment, verifyWebhookSignature } from "@/lib/geniuspay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Webhook GeniusPay.
 *
 * - Signature vérifiée sur le corps BRUT ; signature invalide → 200 sans aucune écriture.
 * - On ne crédite JAMAIS sur la seule foi du webhook : re-vérification GET /payments/{reference},
 *   puis crédit avec le montant VÉRIFIÉ via la RPC confirm_online_payment (idempotente).
 * - 200 = GeniusPay cesse de réessayer ; 500 = nouvel essai (jusqu'à 5 fois sur 6 h).
 * - Ne jamais journaliser (console) le corps brut, la signature ni les données du payeur.
 */

type Body = Record<string, any>;

type ConfirmResult = {
  outcome: string;
  cotisation_id?: string;
  user_id?: string;
  amount_credit?: number;
  amount_paid?: number;
  amount_remaining?: number;
  just_completed?: boolean;
  withdrawal_code?: string | null;
  overpaid?: boolean;
  cotisation_status_before?: string;
  refund_status?: string | null;
  expected?: number;
  received?: number;
};

function reply(status: number) {
  return NextResponse.json({ received: true }, { status });
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "erreur inconnue";
}

/** Copie du corps sans les données du payeur (customer), pour le journal */
function stripCustomer(raw: string): Body | null {
  try {
    const copy = JSON.parse(raw) as Body;
    if (copy && typeof copy === "object") {
      delete copy.customer;
      if (copy.data && typeof copy.data === "object") delete copy.data.customer;
    }
    return copy;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-webhook-signature");
    const timestamp = req.headers.get("x-webhook-timestamp");
    const eventHeader = req.headers.get("x-webhook-event");

    // 1. Signature (corps brut)
    let valid: boolean;
    try {
      valid = verifyWebhookSignature(raw, signature, timestamp);
    } catch (e) {
      // Configuration manquante : GeniusPay réessaiera une fois la config corrigée
      console.error("[webhook geniuspay] configuration:", errorMessage(e));
      return reply(500);
    }
    if (!valid) {
      console.warn("[webhook geniuspay] signature invalide");
      return reply(200);
    }

    // 2. Corps JSON
    let body: Body | null = null;
    try {
      body = JSON.parse(raw) as Body;
    } catch {
      body = null;
    }

    const payload = stripCustomer(raw);

    // Journal d'audit (jamais bloquant)
    const logEvent = async (entry: {
      outcome: string;
      detail?: string;
      merchantRef?: string | null;
      providerRef?: string | null;
    }) => {
      const { error } = await supabaseAdmin.from("webhook_events").insert({
        event_id: body?.id != null ? String(body.id) : null,
        event_type: body?.event ?? eventHeader,
        merchant_ref: entry.merchantRef ?? null,
        provider_ref: entry.providerRef ?? null,
        outcome: entry.outcome,
        detail: entry.detail ?? null,
        payload,
      });
      if (error) {
        console.error("[webhook geniuspay] journal:", error.message);
      }
    };

    if (!body || typeof body !== "object") {
      await logEvent({ outcome: "invalid_json" });
      return reply(200);
    }

    const data: Body = body.data && typeof body.data === "object" ? body.data : {};

    // 3. Environnement : un vrai paiement n'a pas de champ environment
    const env = body.environment ?? data.environment;
    if (env !== undefined && env !== null && env !== process.env.GENIUSPAY_ENV) {
      await logEvent({ outcome: "wrong_environment", detail: String(env) });
      return reply(200);
    }

    // 4. Références
    const merchantRef =
      typeof data.metadata?.merchant_ref === "string" ? data.metadata.merchant_ref : null;
    const providerRef = typeof data.reference === "string" ? data.reference : null;
    const refs = { merchantRef, providerRef };

    const event = body.event ?? eventHeader;

    // 5a. Paiement réussi : re-vérification puis crédit atomique
    if (event === "payment.success") {
      if (!merchantRef || !providerRef) {
        await logEvent({ outcome: "unknown_ref", ...refs });
        return reply(200);
      }

      let verified: Awaited<ReturnType<typeof getPayment>>;
      try {
        verified = await getPayment(providerRef);
      } catch (e) {
        await logEvent({ outcome: "verification_failed", detail: errorMessage(e), ...refs });
        return reply(500);
      }

      const verifiedStatus = verified.status.toLowerCase();
      if (verifiedStatus !== "completed" && verifiedStatus !== "success") {
        // Le statut peut arriver en retard : nouvel essai
        await logEvent({ outcome: "not_completed", detail: verified.status, ...refs });
        return reply(500);
      }
      if (verified.amount === null) {
        await logEvent({ outcome: "verification_failed", detail: "montant absent", ...refs });
        return reply(500);
      }

      // Montant VÉRIFIÉ auprès de GeniusPay, jamais celui du webhook
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
        "confirm_online_payment",
        {
          p_merchant_ref: merchantRef,
          p_provider_ref: providerRef,
          p_amount_charged: verified.amount,
          p_fees: verified.fees,
          p_net_amount: verified.netAmount,
          p_gateway: verified.paymentMethod,
        },
      );

      if (rpcError) {
        await logEvent({ outcome: "error", detail: rpcError.message, ...refs });
        return reply(500);
      }

      const result = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as ConfirmResult | null;
      if (!result?.outcome) {
        await logEvent({ outcome: "error", detail: "résultat RPC vide", ...refs });
        return reply(500);
      }

      await logEvent({
        outcome: result.outcome,
        detail: JSON.stringify({
          overpaid: result.overpaid,
          cotisation_status_before: result.cotisation_status_before,
          refund_status: result.refund_status,
          amount_credit: result.amount_credit,
          expected: result.expected,
          received: result.received,
        }),
        ...refs,
      });

      // Notification au client (échec non bloquant)
      if (result.outcome === "credited" && result.user_id) {
        const notif = result.just_completed
          ? {
              user_id: result.user_id,
              title: "Cotisation complète !",
              message: `Félicitations ! Votre cotisation est entièrement payée. Code de retrait : ${result.withdrawal_code}. Vous pouvez maintenant demander le retrait de votre article.`,
              type: "success",
            }
          : {
              user_id: result.user_id,
              title: "Paiement en ligne reçu",
              message: `${(result.amount_credit ?? 0).toLocaleString("fr-FR")} FCFA crédités. Reste : ${(result.amount_remaining ?? 0).toLocaleString("fr-FR")} FCFA.`,
              type: "info",
            };

        const { error: notifError } = await supabaseAdmin.from("notifications").insert(notif);
        if (notifError) {
          console.error("[webhook geniuspay] notification:", notifError.message);
        }
      }

      // 200 y compris duplicate, unknown_ref, ref_mismatch, amount_mismatch :
      // aucun nouvel essai n'y changerait rien
      return reply(200);
    }

    // 5b. Paiement échoué ou annulé : l'intention en attente passe à "failed"
    if (event === "payment.failed" || event === "payment.cancelled") {
      if (merchantRef) {
        const { error } = await supabaseAdmin
          .from("payment_intents")
          .update({ status: "failed", failure_reason: event })
          .eq("merchant_ref", merchantRef)
          .eq("status", "pending");

        if (error) {
          await logEvent({ outcome: "error", detail: error.message, ...refs });
          return reply(500);
        }
      }
      await logEvent({ outcome: "marked_failed", ...refs });
      return reply(200);
    }

    // 5c. Tout autre événement
    await logEvent({ outcome: "ignored", ...refs });
    return reply(200);
  } catch (e) {
    console.error("[webhook geniuspay] erreur imprévue:", errorMessage(e));
    return reply(500);
  }
}
