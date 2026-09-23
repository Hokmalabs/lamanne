/**
 * Connexion client par numéro + PIN (route PUBLIQUE).
 *
 * - L'essai est réservé AVANT la vérification (pin_attempt_begin, verrou
 *   ligne en base) : des requêtes parallèles ne peuvent pas contourner le
 *   blocage progressif.
 * - Un numéro inexistant prend le même temps qu'un vrai compte (vérification
 *   sur un hash factice) et renvoie le même message : on ne peut pas deviner
 *   quels numéros sont inscrits.
 * - Aucun PIN ni hash n'est loggé.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCIPhone, phoneToLoginEmail, PHONE_FORMAT_MESSAGE } from "@/lib/phone";
import { PIN_REGEX, pinProblem } from "@/lib/pin-rules";
import { hashPin, verifyPin, verifyAgainstDummy } from "@/lib/pin";
import { openSessionForEmail } from "@/lib/phone-session";
import {
  checkOrigin,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const GENERIC = "Numéro ou code incorrect.";
const LOGIN_FAILED = "Connexion impossible pour le moment";

const schema = z.object({
  phone: z.string().min(1, "Numéro requis").max(30, "Numéro trop long"),
  pin: z.string().max(10, "Code PIN invalide"),
  new_pin: z.string().max(10, "Code PIN invalide").optional(),
});

function lockedMessage(until: Date): string {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
  return `Trop d'essais. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`;
}

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const { phone: rawPhone, pin, new_pin } = validateInput(schema, await req.json());

    // a) Numéro
    const phone = normalizeCIPhone(rawPhone);
    if (!phone) {
      throw new ApiError(400, PHONE_FORMAT_MESSAGE, "INVALID_INPUT");
    }

    // b) Format du PIN (même temps de réponse qu'une vraie vérification)
    if (!PIN_REGEX.test(pin)) {
      await verifyAgainstDummy(pin);
      throw new ApiError(401, GENERIC, "UNAUTHENTICATED");
    }

    // c) Compte
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_suspended")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError) {
      console.error("[phone-login] profile lookup:", profileError);
      throw new ApiError(500, LOGIN_FAILED, "INTERNAL");
    }
    if (!profile) {
      await verifyAgainstDummy(pin);
      throw new ApiError(401, GENERIC, "UNAUTHENTICATED");
    }

    // d) Réservation de l'essai
    const { data: lockedUntil, error: beginError } = await supabaseAdmin.rpc(
      "pin_attempt_begin",
      { p_user_id: profile.id },
    );

    if (beginError) {
      console.error("[phone-login] pin_attempt_begin:", beginError);
      throw new ApiError(500, LOGIN_FAILED, "INTERNAL");
    }
    if (lockedUntil !== null) {
      if (String(lockedUntil).toLowerCase() === "infinity") {
        // Pas de PIN (compte équipe, etc.) : même réponse qu'un mauvais code
        await verifyAgainstDummy(pin);
        throw new ApiError(401, GENERIC, "UNAUTHENTICATED");
      }
      const until = new Date(lockedUntil as string);
      if (Number.isNaN(until.getTime())) {
        console.error("[phone-login] pin_attempt_begin: date de blocage illisible");
        throw new ApiError(500, LOGIN_FAILED, "INTERNAL");
      }
      throw new ApiError(429, lockedMessage(until));
    }

    // e) PIN stocké
    const { data: authPin, error: authPinError } = await supabaseAdmin
      .from("auth_pins")
      .select("pin_hash, must_change, temp_expires_at")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (authPinError) {
      console.error("[phone-login] auth_pins lookup, code:", authPinError.code);
      throw new ApiError(500, LOGIN_FAILED, "INTERNAL");
    }
    if (!authPin) {
      throw new ApiError(401, GENERIC, "UNAUTHENTICATED");
    }

    // f) Vérification
    if (!(await verifyPin(pin, authPin.pin_hash))) {
      throw new ApiError(401, GENERIC, "UNAUTHENTICATED");
    }

    // g) Remise à zéro du compteur (échec non bloquant)
    const { error: successError } = await supabaseAdmin.rpc("pin_attempt_success", {
      p_user_id: profile.id,
    });
    if (successError) {
      console.error("[phone-login] pin_attempt_success:", successError);
    }

    // h) Compte suspendu
    if (profile.is_suspended) {
      throw new ApiError(403, "Votre compte a été suspendu. Contactez votre agent.", "SUSPENDED");
    }

    // i) PIN temporaire : changement obligatoire avant toute session
    if (authPin.must_change) {
      if (!authPin.temp_expires_at || new Date(authPin.temp_expires_at).getTime() <= Date.now()) {
        throw new ApiError(
          403,
          "Ce code temporaire a expiré. Demandez un nouveau code à votre agent.",
          "FORBIDDEN",
        );
      }

      if (new_pin === undefined) {
        return NextResponse.json({ ok: true, pin_change_required: true });
      }

      const problem = pinProblem(new_pin, phone);
      if (problem) {
        throw new ApiError(400, problem, "INVALID_INPUT");
      }
      if (new_pin === pin) {
        throw new ApiError(
          400,
          "Choisissez un code différent du code temporaire.",
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
        .eq("user_id", profile.id);

      if (updateError) {
        console.error("[phone-login] update auth_pins, code:", updateError.code);
        throw new ApiError(500, LOGIN_FAILED, "INTERNAL");
      }
    }

    // j) Session
    await openSessionForEmail(phoneToLoginEmail(phone));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
