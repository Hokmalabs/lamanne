import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadManageableTarget } from "@/lib/equipe-guards";
import { generateStaffPassword } from "@/lib/staff-password";
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
  id: z.uuid("Identifiant de membre invalide"),
});

/**
 * Régénère le mot de passe d'un membre de l'équipe.
 *
 * Attention : les sessions déjà ouvertes avec l'ancien mot de passe restent
 * valides. Pour couper immédiatement l'accès d'un membre, il faut le
 * SUSPENDRE (POST /api/admin/equipe/suspend), pas seulement régénérer.
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

    await loadManageableTarget(ctx, id, "regenerate_password");

    // Généré côté serveur, renvoyé une seule fois, jamais stocké
    const password = generateStaffPassword();

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { password },
    );

    if (authError) {
      console.error("[equipe password] updateUserById:", authError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    revalidatePath("/admin/equipe");

    return NextResponse.json(
      { ok: true, password },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
