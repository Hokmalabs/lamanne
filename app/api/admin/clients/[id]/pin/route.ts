import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCIPhone } from "@/lib/phone";
import { generateTempPin, hashPin, TEMP_PIN_TTL_MS } from "@/lib/pin";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  id: z.uuid("Identifiant invalide"),
});

const RESET_FAILED = "Réinitialisation du code impossible";

/**
 * Réinitialisation du PIN d'un client par un admin : nouveau PIN temporaire
 * (à changer à la prochaine connexion), compteur d'essais et blocage remis
 * à zéro. Le PIN temporaire est renvoyé UNE SEULE FOIS ici.
 *
 * Les sessions déjà ouvertes du client restent valides.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, role, phone")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      console.error("[admin client pin] profile lookup:", targetError);
      throw new ApiError(500, RESET_FAILED, "INTERNAL");
    }
    if (!target) {
      throw new ApiError(404, "Client introuvable", "NOT_FOUND");
    }
    if (target.role !== "user") {
      throw new ApiError(403, "Ce compte n'est pas un compte client", "FORBIDDEN");
    }

    const tempPin = generateTempPin(normalizeCIPhone(target.phone ?? "") ?? "");
    const now = Date.now();

    const { error: upsertError } = await supabaseAdmin.from("auth_pins").upsert(
      {
        user_id: target.id,
        pin_hash: await hashPin(tempPin),
        must_change: true,
        temp_expires_at: new Date(now + TEMP_PIN_TTL_MS).toISOString(),
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      console.error("[admin client pin] upsert auth_pins, code:", upsertError.code);
      throw new ApiError(500, RESET_FAILED, "INTERNAL");
    }

    // Le PIN temporaire transite ici et nulle part ailleurs : pas de cache
    return NextResponse.json(
      { ok: true, temp_pin: tempPin },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
