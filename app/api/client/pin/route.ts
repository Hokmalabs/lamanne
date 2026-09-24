import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pinProblem } from "@/lib/pin-rules";
import { hashPin, verifyPin } from "@/lib/pin";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const NO_PIN = "Aucun code PIN n'est associé à ce compte.";
const UPDATE_FAILED = "Modification du code impossible";

const schema = z.object({
  current_pin: z.string().max(10, "Code PIN invalide"),
  new_pin: z.string().max(10, "Code PIN invalide"),
});

function lockedMessage(until: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Trop d'essais. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

/**
 * Changement de PIN par le client connecté. Le code actuel est vérifié avec
 * le même blocage progressif que la connexion (essai réservé AVANT la
 * vérification). Aucun PIN ni hash n'est loggé.
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["user"]);
    const { current_pin, new_pin } = validateInput(schema, await req.json());

    // Réservation de l'essai
    const { data: lockedUntil, error: beginError } = await supabaseAdmin.rpc(
      "pin_attempt_begin",
      { p_user_id: ctx.user.id },
    );

    if (beginError) {
      console.error("[client pin] pin_attempt_begin:", beginError);
      throw new ApiError(500, UPDATE_FAILED, "INTERNAL");
    }
    if (lockedUntil !== null) {
      if (String(lockedUntil).toLowerCase() === "infinity") {
        throw new ApiError(400, NO_PIN, "INVALID_INPUT");
      }
      const until = new Date(lockedUntil as string);
      if (Number.isNaN(until.getTime())) {
        console.error("[client pin] pin_attempt_begin: date de blocage illisible");
        throw new ApiError(500, UPDATE_FAILED, "INTERNAL");
      }
      throw new ApiError(429, lockedMessage(until));
    }

    // Vérification du code actuel
    const { data: authPin, error: authPinError } = await supabaseAdmin
      .from("auth_pins")
      .select("pin_hash")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (authPinError) {
      console.error("[client pin] auth_pins lookup, code:", authPinError.code);
      throw new ApiError(500, UPDATE_FAILED, "INTERNAL");
    }
    if (!authPin) {
      throw new ApiError(400, NO_PIN, "INVALID_INPUT");
    }
    if (!(await verifyPin(current_pin, authPin.pin_hash))) {
      throw new ApiError(401, "Code actuel incorrect.", "UNAUTHENTICATED");
    }

    const { error: successError } = await supabaseAdmin.rpc("pin_attempt_success", {
      p_user_id: ctx.user.id,
    });
    if (successError) {
      console.error("[client pin] pin_attempt_success:", successError);
    }

    // Robustesse du nouveau code (règle de fin de numéro incluse)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("id", ctx.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("[client pin] profile lookup:", profileError ?? "profil absent");
      throw new ApiError(500, UPDATE_FAILED, "INTERNAL");
    }

    const problem = pinProblem(new_pin, profile.phone ?? undefined);
    if (problem) {
      throw new ApiError(400, problem, "INVALID_INPUT");
    }
    if (new_pin === current_pin) {
      throw new ApiError(
        400,
        "Le nouveau code doit être différent de l'actuel.",
        "INVALID_INPUT",
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("auth_pins")
      .update({
        pin_hash: await hashPin(new_pin),
        must_change: false,
        temp_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", ctx.user.id);

    if (updateError) {
      console.error("[client pin] update auth_pins, code:", updateError.code);
      throw new ApiError(500, UPDATE_FAILED, "INTERNAL");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
