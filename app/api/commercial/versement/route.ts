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
import { MIN_VERSEMENT_CASH } from "@/lib/versement";

export const dynamic = "force-dynamic";

const schema = z.object({
  cotisation_id: z.string().uuid("ID de cotisation invalide"),
  // Minimum métier vérifié plus bas : un reste < MIN_VERSEMENT_CASH peut être soldé
  amount: z.number().int("Montant entier requis").min(1, "Montant invalide"),
  idempotency_key: z.string().uuid("Clé de versement invalide"),
});

/** Résultat de la RPC record_payment (v2) */
type RecordPaymentResult = {
  idempotent: boolean;
  just_completed: boolean;
  new_status: string;
  amount_paid: number;
  amount_remaining: number;
  withdrawal_code: string | null;
};

/** Codes d'erreur levés par record_payment → réponse HTTP */
const RPC_ERRORS: { code: string; status: number; message: string }[] = [
  { code: "COTISATION_INTROUVABLE", status: 404, message: "Cotisation introuvable" },
  { code: "COTISATION_NON_ACTIVE", status: 409, message: "Cette cotisation n'est plus active" },
  {
    code: "REMBOURSEMENT_EN_COURS",
    status: 409,
    message: "Un remboursement est en cours sur cette cotisation : aucun versement possible",
  },
  { code: "MONTANT_INVALIDE", status: 400, message: "Montant invalide" },
  { code: "MONTANT_DEPASSE_RESTE", status: 400, message: "Le versement dépasse le montant restant" },
  {
    code: "CLE_IDEMPOTENCE_REUTILISEE",
    status: 409,
    message: "Un versement précédent a déjà été enregistré. Vérifiez la cotisation avant de recommencer.",
  },
  { code: "CLE_IDEMPOTENCE_INVALIDE", status: 400, message: "Clé de versement invalide" },
];

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { cotisation_id, amount, idempotency_key } = validateInput(
      schema,
      await req.json(),
    );

    // Récupérer la cotisation (le plafond reste vérifié par la RPC, sous verrou)
    const { data: cot, error: cotFetchError } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, total_price, amount_paid")
      .eq("id", cotisation_id)
      .maybeSingle();

    if (cotFetchError) {
      console.error("[Versement] cotisation fetch:", cotFetchError);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }
    if (!cot) {
      throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    }

    // Vérification d'autorisation : le commercial doit être assigné au client
    if (ctx.profile.role === "commercial") {
      const { data: clientProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("assigned_commercial")
        .eq("id", cot.user_id)
        .maybeSingle();

      if (profileError) {
        console.error("[Versement] client profile fetch:", profileError);
        throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
      }

      if (clientProfile?.assigned_commercial !== ctx.user.id) {
        throw new ApiError(
          403,
          "Vous n'êtes pas autorisé à encaisser pour ce client",
          "FORBIDDEN",
        );
      }
    }

    // Minimum : MIN_VERSEMENT_CASH, sauf pour solder exactement le reste
    const reste = (cot.total_price as number) - (cot.amount_paid as number);
    if (amount < MIN_VERSEMENT_CASH && amount !== reste) {
      // Rejeu d'un solde final déjà enregistré (reste désormais à 0) : laisser la RPC
      // répondre « déjà enregistré » au lieu de rejeter le renvoi.
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("transaction_ref", idempotency_key)
        .maybeSingle();

      if (existingError) {
        console.error("[Versement] idempotency lookup:", existingError);
        throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
      }
      if (!existing) {
        throw new ApiError(
          400,
          `Le montant minimum est de ${MIN_VERSEMENT_CASH.toLocaleString("fr-FR")} FCFA, sauf pour solder le reste`,
          "INVALID_INPUT",
        );
      }
    }

    // Enregistrement atomique (verrou de ligne, idempotence, code de retrait)
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "record_payment",
      {
        p_cotisation_id: cotisation_id,
        p_amount: amount,
        p_recorded_by: ctx.user.id,
        p_idempotency_key: idempotency_key,
      },
    );

    if (rpcError) {
      const known = RPC_ERRORS.find((e) => rpcError.message?.includes(e.code));
      if (known) {
        throw new ApiError(
          known.status,
          known.message,
          known.status === 404 ? "NOT_FOUND" : "INVALID_INPUT",
        );
      }
      console.error("[Versement] record_payment:", rpcError);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    const data = (
      Array.isArray(rpcData) ? rpcData[0] : rpcData
    ) as RecordPaymentResult | null;

    if (!data) {
      console.error("[Versement] record_payment: résultat vide");
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    // Notifier le client uniquement pour un nouveau versement (échec non bloquant)
    if (data.idempotent === false) {
      const notif = data.just_completed
        ? {
            user_id: cot.user_id,
            title: "Cotisation complète !",
            message: `Félicitations ! Votre cotisation est entièrement payée. Code de retrait : ${data.withdrawal_code}. Vous pouvez maintenant demander le retrait de votre article.`,
            type: "success",
          }
        : {
            user_id: cot.user_id,
            title: "Versement enregistré",
            message: `Un versement de ${amount.toLocaleString("fr-FR")} FCFA a été enregistré. Reste : ${data.amount_remaining.toLocaleString("fr-FR")} FCFA.`,
            type: "info",
          };

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert(notif);

      if (notifError) {
        console.error("[Versement] notification insert:", notifError);
      }
    }

    // Le code de retrait n'est JAMAIS renvoyé à l'agent (anti-fraude)
    return NextResponse.json({
      ok: true,
      idempotent: data.idempotent,
      completed: data.new_status === "completed",
      amount,
      amount_paid: data.amount_paid,
      amount_remaining: data.amount_remaining,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
