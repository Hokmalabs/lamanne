import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClientAccount } from "@/lib/client-accounts";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Nom trop long (100 caractères maximum)"),
  phone: z.string().min(1, "Numéro requis").max(30, "Numéro trop long"),
});

/**
 * Création d'un compte client par un commercial (ou un admin / super_admin).
 *
 * - assigned_commercial n'est JAMAIS lu du body : c'est l'appelant s'il est
 *   commercial, sinon null (l'admin assigne ensuite via son propre flow)
 * - Le client reçoit un PIN temporaire, renvoyé UNE SEULE FOIS ici, qu'il
 *   devra changer à sa première connexion
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["commercial", "admin", "super_admin"]);
    const { full_name, phone } = validateInput(schema, await req.json());

    const assignedCommercial = ctx.profile.role === "commercial" ? ctx.user.id : null;

    const { userId, tempPin } = await createClientAccount({
      fullName: full_name,
      rawPhone: phone,
      createdBy: ctx.user.id,
      assignedCommercial,
      pinMode: { kind: "temporary" },
    });

    // Notification de bienvenue (échec non bloquant : le compte est créé)
    const { error: notifError } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: "Bienvenue sur LAMANNE",
      message:
        "Votre compte a été créé par votre agent commercial. Vous pouvez consulter le catalogue et suivre vos cotisations dans votre espace.",
      type: "info",
    });
    if (notifError) {
      console.error("[RegisterClient] notification:", notifError);
    }

    // Le PIN temporaire transite ici et nulle part ailleurs : pas de cache
    return NextResponse.json(
      { ok: true, client_id: userId, temp_pin: tempPin },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
