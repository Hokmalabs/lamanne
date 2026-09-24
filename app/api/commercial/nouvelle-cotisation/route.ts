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
  client_id: z.string().uuid("Identifiant client invalide"),
  product_id: z.string().uuid("Identifiant produit invalide"),
  months: z.number().int("Durée invalide").min(1, "Durée invalide"),
  first_payment: z.number().int("Montant entier requis").min(0, "Montant invalide"),
  idempotency_key: z.string().uuid("Clé invalide"),
});

/** Résultat de record_payment, imbriqué quand un premier versement est fait */
type PaymentResult = {
  idempotent: boolean;
  just_completed: boolean;
  new_status: string;
  amount_paid: number;
  amount_remaining: number;
  withdrawal_code: string | null;
};

/** Résultat de la RPC create_cotisation_with_payment */
type CreateCotisationResult = {
  idempotent: boolean;
  cotisation_id: string;
  payment?: PaymentResult | null;
  // Présents uniquement en cas de rejeu (idempotent: true)
  amount_paid?: number;
  new_status?: string;
};

/** Codes d'erreur levés par create_cotisation_with_payment → réponse HTTP */
const RPC_ERRORS: { code: string; status: number; message: string }[] = [
  { code: "PRODUIT_INTROUVABLE", status: 404, message: "Produit introuvable" },
  { code: "PRODUIT_INDISPONIBLE", status: 409, message: "Produit indisponible" },
  { code: "DUREE_INVALIDE", status: 400, message: "Cette durée n'est pas proposée pour cet article" },
  { code: "MONTANT_INVALIDE", status: 400, message: "Montant invalide" },
  { code: "MONTANT_DEPASSE_RESTE", status: 400, message: "Le versement dépasse le prix de l'article" },
  {
    code: "CLE_IDEMPOTENCE_REUTILISEE",
    status: 409,
    message: "Une opération précédente a déjà été enregistrée. Vérifiez la fiche du client.",
  },
  { code: "CLE_IDEMPOTENCE_INVALIDE", status: 400, message: "Clé invalide" },
];

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { client_id, product_id, months, first_payment, idempotency_key } =
      validateInput(schema, await req.json());

    // Client : doit exister, être un client actif et (pour un agent) lui être assigné
    const { data: client, error: clientError } = await supabaseAdmin
      .from("profiles")
      .select("role, is_suspended, assigned_commercial")
      .eq("id", client_id)
      .maybeSingle();

    if (clientError) {
      console.error("[NouvelleCotisation] client fetch:", clientError);
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }
    if (!client || client.role !== "user") {
      throw new ApiError(404, "Client introuvable", "NOT_FOUND");
    }
    if (
      ctx.profile.role === "commercial" &&
      client.assigned_commercial !== ctx.user.id
    ) {
      throw new ApiError(403, "Ce client ne vous est pas assigné", "FORBIDDEN");
    }
    if (client.is_suspended) {
      throw new ApiError(403, "Ce client est suspendu", "FORBIDDEN");
    }

    // Produit : prix nécessaire pour la règle du minimum (le reste est vérifié par la RPC)
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("price")
      .eq("id", product_id)
      .maybeSingle();

    if (productError) {
      console.error("[NouvelleCotisation] product fetch:", productError);
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }
    if (!product) {
      throw new ApiError(404, "Produit introuvable", "NOT_FOUND");
    }

    // Premier versement : 0 F, au moins MIN_VERSEMENT_CASH, ou le prix exact
    if (
      first_payment > 0 &&
      first_payment < MIN_VERSEMENT_CASH &&
      first_payment !== product.price
    ) {
      throw new ApiError(
        400,
        `Le premier versement doit être d'au moins ${MIN_VERSEMENT_CASH.toLocaleString("fr-FR")} FCFA (ou 0 F)`,
        "INVALID_INPUT",
      );
    }

    // Création atomique : cotisation + premier versement éventuel, idempotente par clé
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "create_cotisation_with_payment",
      {
        p_user_id: client_id,
        p_product_id: product_id,
        p_months: months,
        p_first_payment: first_payment,
        p_created_by: ctx.user.id,
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
      console.error("[NouvelleCotisation] create_cotisation_with_payment:", rpcError);
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }

    const data = (
      Array.isArray(rpcData) ? rpcData[0] : rpcData
    ) as CreateCotisationResult | null;

    if (!data?.cotisation_id) {
      console.error("[NouvelleCotisation] create_cotisation_with_payment: résultat vide");
      throw new ApiError(500, "Erreur de création", "INTERNAL");
    }

    const payment = data.payment ?? null;

    // Notifier le client uniquement pour une nouvelle création (échec non bloquant)
    if (data.idempotent === false) {
      const notif = payment?.just_completed
        ? {
            user_id: client_id,
            title: "Cotisation complète !",
            message: `Félicitations ! Votre cotisation est entièrement payée. Code de retrait : ${payment.withdrawal_code}. Vous pouvez maintenant demander le retrait de votre article.`,
            type: "success",
          }
        : first_payment > 0
          ? {
              user_id: client_id,
              title: "Nouvelle cotisation démarrée",
              message: `Premier versement : ${first_payment.toLocaleString("fr-FR")} FCFA.`,
              type: "info",
            }
          : {
              user_id: client_id,
              title: "Nouvelle cotisation démarrée",
              message: "Votre agent a créé une cotisation pour vous.",
              type: "info",
            };

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert(notif);

      if (notifError) {
        console.error("[NouvelleCotisation] notification insert:", notifError);
      }
    }

    // Le code de retrait n'est JAMAIS renvoyé à l'agent (anti-fraude)
    return NextResponse.json({
      ok: true,
      idempotent: data.idempotent,
      cotisation_id: data.cotisation_id,
      completed: (payment?.new_status ?? data.new_status) === "completed",
      amount_paid: payment?.amount_paid ?? data.amount_paid ?? 0,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
