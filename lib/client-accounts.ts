/**
 * Création d'un compte client — SERVEUR uniquement.
 *
 * SEUL point de création d'un compte client (inscription publique, création
 * par un commercial ou un admin). Le client s'authentifie par numéro + PIN
 * vérifié par notre serveur : le mot de passe Supabase est aléatoire, jamais
 * renvoyé, jamais stocké, jamais utilisé.
 *
 * Aucun PIN ni hash n'est loggé.
 */

import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ApiError } from "@/lib/api-security";
import { normalizeCIPhone, phoneToLoginEmail, PHONE_FORMAT_MESSAGE } from "@/lib/phone";
import { pinProblem } from "@/lib/pin-rules";
import { hashPin, generateTempPin, TEMP_PIN_TTL_MS } from "@/lib/pin";

export type ClientPinMode = { kind: "chosen"; pin: string } | { kind: "temporary" };

const ALREADY_REGISTERED = "Ce numéro est déjà inscrit";
const CREATION_FAILED = "Création du compte impossible";

export async function createClientAccount(input: {
  fullName: string; // déjà trimé, 2 à 100 caractères (validé par l'appelant)
  rawPhone: string;
  createdBy: string | null;
  assignedCommercial: string | null;
  pinMode: ClientPinMode;
}): Promise<{ userId: string; phone: string; loginEmail: string; tempPin: string | null }> {
  const { fullName, rawPhone, createdBy, assignedCommercial, pinMode } = input;

  // a) Numéro
  const phone = normalizeCIPhone(rawPhone);
  if (!phone) {
    throw new ApiError(400, PHONE_FORMAT_MESSAGE, "INVALID_INPUT");
  }

  // b) PIN choisi ou temporaire
  let pin: string;
  let tempPin: string | null = null;
  if (pinMode.kind === "chosen") {
    const problem = pinProblem(pinMode.pin, phone);
    if (problem) {
      throw new ApiError(400, problem, "INVALID_INPUT");
    }
    pin = pinMode.pin;
  } else {
    tempPin = generateTempPin(phone);
    pin = tempPin;
  }

  // c) Numéro déjà inscrit
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingError) {
    console.error("[createClientAccount] phone lookup:", existingError);
    throw new ApiError(500, CREATION_FAILED, "INTERNAL");
  }
  if (existing) {
    throw new ApiError(409, ALREADY_REGISTERED, "INVALID_INPUT");
  }

  // d) Compte auth : mot de passe aléatoire, jamais renvoyé ni stocké ni utilisé
  const loginEmail = phoneToLoginEmail(phone);
  const password = randomBytes(32).toString("base64url");

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  });

  if (createError) {
    console.error("[createClientAccount] createUser:", createError);
    const { message: createMessage, status: createStatus } = createError;
    const alreadyExists =
      createStatus === 422 || /already|registered/i.test(createMessage ?? "");
    if (alreadyExists) {
      throw new ApiError(409, ALREADY_REGISTERED, "INVALID_INPUT");
    }
    throw new ApiError(500, CREATION_FAILED, "INTERNAL");
  }

  const userId = created?.user?.id;
  if (!userId) {
    console.error("[createClientAccount] createUser: aucun utilisateur renvoyé");
    throw new ApiError(500, CREATION_FAILED, "INTERNAL");
  }

  try {
    // e) Le trigger handle_new_user a créé le profil (role 'user') : on le complète
    const { data: updated, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        created_by: createdBy,
        assigned_commercial: assignedCommercial,
      })
      .eq("id", userId)
      .select("id");

    if (profileError) {
      console.error("[createClientAccount] update profile:", profileError);
      if (profileError.code === "23505") {
        throw new ApiError(409, ALREADY_REGISTERED, "INVALID_INPUT");
      }
      throw new ApiError(500, CREATION_FAILED, "INTERNAL");
    }
    if (!updated || updated.length === 0) {
      console.error("[createClientAccount] update profile: aucun profil pour", userId);
      throw new ApiError(500, CREATION_FAILED, "INTERNAL");
    }

    // f) PIN haché
    const mustChange = pinMode.kind === "temporary";
    const { error: pinError } = await supabaseAdmin.from("auth_pins").insert({
      user_id: userId,
      pin_hash: await hashPin(pin),
      must_change: mustChange,
      temp_expires_at: mustChange ? new Date(Date.now() + TEMP_PIN_TTL_MS).toISOString() : null,
    });

    if (pinError) {
      // Seul le code est loggé : le détail d'une violation de contrainte
      // contient la ligne complète, donc le hash
      console.error("[createClientAccount] insert auth_pins, code:", pinError.code);
      throw new ApiError(500, CREATION_FAILED, "INTERNAL");
    }
  } catch (err) {
    // g) Rollback best effort : sans profil complet ni PIN, le compte est inutilisable

    // Le trigger a créé le profil avec le numéro ; sans FK en cascade garantie,
    // un profil orphelin bloquerait ce numéro pour toujours via l'index unique.
    try {
      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (profileDeleteError) {
        console.error(
          "[createClientAccount] rollback delete profile, code:",
          profileDeleteError.code,
        );
      }
    } catch (profileDeleteErr) {
      console.error("[createClientAccount] rollback delete profile:", profileDeleteErr);
    }

    try {
      const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (rollbackError) {
        console.error("[createClientAccount] rollback deleteUser:", rollbackError);
      }
    } catch (rollbackErr) {
      console.error("[createClientAccount] rollback deleteUser:", rollbackErr);
    }

    if (err instanceof ApiError) throw err;
    console.error("[createClientAccount] finalisation:", err);
    throw new ApiError(500, CREATION_FAILED, "INTERNAL");
  }

  return { userId, phone, loginEmail, tempPin };
}
