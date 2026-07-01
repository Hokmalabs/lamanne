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

export const dynamic = "force-dynamic";

const schema = z.object({
  full_name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  phone: z.string().regex(/^\+\d{10,15}$/, "Numéro de téléphone invalide (format international attendu, ex: +225XXXXXXXXXX)"),
});

/**
 * Route utilisée par un commercial (ou admin/super_admin) pour créer un
 * nouveau compte client qui sera automatiquement assigné au commercial
 * appelant.
 *
 * Différences avec /api/auth/register-phone (auto-inscription anonyme) :
 * - Nécessite une session authentifiée (commercial ou plus)
 * - assigned_commercial est TOUJOURS rempli côté serveur avec ctx.user.id
 *   (jamais lu du body, sécurité par construction)
 * - Le rôle du client créé est TOUJOURS "user" (hardcodé)
 * - Pour un admin/super_admin qui crée un client, assigned_commercial reste
 *   ctx.user.id (l'admin peut réassigner ensuite via un autre flow admin)
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { full_name, phone } = validateInput(schema, await req.json());

    // Vérifier si un profil avec ce téléphone existe déjà
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      throw new ApiError(409, "Ce numéro de téléphone est déjà enregistré", "INVALID_INPUT");
    }

    // Générer un email fake déterministe à partir du téléphone (compatibilité Supabase Auth)
    const fakeEmail = `${phone.replace(/[^0-9]/g, "")}@lamanne.local`;

    // Générer un mot de passe temporaire (le client se connectera via téléphone)
    const tempPassword = `${randomInt(100000, 999999)}-${randomInt(100000, 999999)}`;

    // 1. Créer le compte auth (le trigger handle_new_user créera le profile avec role='user')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fakeEmail,
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name,
        phone,
      },
    });

    if (authError || !authData?.user) {
      console.error("[RegisterClient] auth create user:", authError);
      throw new ApiError(500, "Erreur lors de la création du compte", "INTERNAL");
    }

    const newUserId = authData.user.id;

    // 2. Mettre à jour le profile pour renseigner l'assignation commerciale
    //    Le trigger handle_new_user a déjà créé le profil avec role='user' par défaut.
    //    On patch seulement assigned_commercial + full_name + phone (au cas où le trigger
    //    n'a pas récupéré les metadata).
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        phone,
        assigned_commercial: ctx.user.id,
      })
      .eq("id", newUserId);

    if (updateError) {
      console.error("[RegisterClient] profile update:", updateError);
      // Non bloquant : le compte auth existe déjà, on log mais on retourne succès
      // pour éviter de bloquer le commercial sur un cas où le trigger n'aurait pas
      // encore créé le profil au moment de l'update
    }

    // 3. Notifier le nouveau client (bienvenue)
    await supabaseAdmin.from("notifications").insert({
      user_id: newUserId,
      title: "Bienvenue sur LAMANNE",
      message: `Votre compte a été créé par votre agent commercial. Vous pouvez consulter le catalogue et suivre vos cotisations dans votre espace.`,
      type: "info",
    });

    return NextResponse.json({
      ok: true,
      client_id: newUserId,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
