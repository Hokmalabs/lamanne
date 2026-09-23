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

// Frais de dossier retenus sur les versements déjà encaissés (10%)
const REFUND_RATE = 0.9;

const schema = z.object({
  cotisation_id: z.string().uuid("Cotisation invalide"),
  motif: z
    .string()
    .min(1, "Le motif est obligatoire")
    .max(500, "Motif trop long (500 caractères maximum)"),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { cotisation_id, motif } = validateInput(schema, await req.json());

    // 1. La cotisation doit exister. Le propriétaire se déduit d'elle :
    // aucun identifiant de client n'est accepté depuis le navigateur.
    const { data: cotisation, error: readError } = await supabaseAdmin
      .from("cotisations")
      .select("id, user_id, status, amount_paid, refund_status")
      .eq("id", cotisation_id)
      .maybeSingle();

    if (readError) {
      console.error("[CommercialRemboursement] read cotisation:", readError);
      throw new ApiError(500, "Erreur de lecture", "INTERNAL");
    }

    if (!cotisation) {
      throw new ApiError(404, "Cotisation introuvable", "NOT_FOUND");
    }

    // 2. Un commercial ne peut agir que sur les clients qui lui sont assignés
    if (ctx.profile.role === "commercial") {
      const { data: owner, error: ownerError } = await supabaseAdmin
        .from("profiles")
        .select("id, assigned_commercial")
        .eq("id", cotisation.user_id)
        .maybeSingle();

      if (ownerError) {
        console.error("[CommercialRemboursement] read profile:", ownerError);
        throw new ApiError(500, "Erreur de lecture", "INTERNAL");
      }

      if (!owner || owner.assigned_commercial !== ctx.user.id) {
        throw new ApiError(403, "Ce client ne vous est pas assigné", "FORBIDDEN");
      }
    }

    // 3. Seule une cotisation active peut faire l'objet d'une demande
    if (cotisation.status !== "active") {
      throw new ApiError(
        409,
        "Seule une cotisation active peut faire l'objet d'une demande de remboursement",
        "INVALID_INPUT",
      );
    }

    // 4. Garde anti-doublon tolérante aux valeurs NULL / 'none'
    if (cotisation.refund_status && cotisation.refund_status !== "none") {
      throw new ApiError(
        409,
        "Une demande de remboursement est déjà en cours",
        "INVALID_INPUT",
      );
    }

    // 5. Rien à rembourser si aucun versement n'a été encaissé
    if (cotisation.amount_paid <= 0) {
      throw new ApiError(400, "Aucun montant à rembourser", "INVALID_INPUT");
    }

    // Montant calculé côté serveur uniquement (jamais fourni par le client)
    const refundAmount = Math.floor(cotisation.amount_paid * REFUND_RATE);

    // La cotisation reste 'active' : l'annulation effective se fait à
    // l'approbation admin.
    const { error: updateError } = await supabaseAdmin
      .from("cotisations")
      .update({
        refund_status: "requested",
        refund_amount: refundAmount,
        refund_requested_at: new Date().toISOString(),
        cancellation_reason: motif,
      })
      .eq("id", cotisation_id);

    if (updateError) {
      console.error("[CommercialRemboursement] update:", updateError);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }

    // Notification au propriétaire de la cotisation (échec non bloquant),
    // après l'écriture réussie uniquement.
    await supabaseAdmin.from("notifications").insert({
      user_id: cotisation.user_id,
      title: "Demande de remboursement",
      message: `Une demande de remboursement a été initiée pour votre cotisation. Montant prévu : ${refundAmount.toLocaleString("fr-FR")} FCFA. Un administrateur la traitera prochainement.`,
      type: "info",
    });

    return NextResponse.json({ ok: true, refund_amount: refundAmount });
  } catch (e) {
    return handleApiError(e);
  }
}
