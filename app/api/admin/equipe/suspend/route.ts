import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadManageableTarget } from "@/lib/equipe-guards";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

// ~100 ans : Supabase n'expose pas de bannissement permanent
const BAN_FOREVER = "876000h";
const BAN_NONE = "none";

const SuspendSchema = z.object({
  member_id: z.uuid("Identifiant de membre invalide"),
  action: z.enum(["suspend", "reactivate"]),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { member_id, action } = validateInput(SuspendSchema, await req.json());

    const target = await loadManageableTarget(ctx, member_id, action);

    const shouldSuspend = action === "suspend";

    // Déjà actif : rien à écrire
    if (!shouldSuspend && !target.is_suspended) {
      return NextResponse.json({ ok: true });
    }

    // Déjà suspendu côté profil : on rattrape les comptes suspendus AVANT
    // l'introduction du ban Auth, qui n'ont jamais été bannis. L'opération est
    // idempotente, le profil est déjà à jour — donc aucune écriture ni rollback.
    if (shouldSuspend && target.is_suspended) {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        member_id,
        { ban_duration: BAN_FOREVER },
      );

      if (banError) {
        console.error("[equipe suspend] backfill ban:", banError);
        throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
      }

      revalidatePath("/admin/equipe");
      return NextResponse.json({ ok: true });
    }

    // L'accès se coupe côté auth d'abord (le profil seul ne bloque pas la session)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      member_id,
      { ban_duration: shouldSuspend ? BAN_FOREVER : BAN_NONE },
    );

    if (authError) {
      console.error("[equipe suspend] updateUserById:", authError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_suspended: shouldSuspend })
      .eq("id", member_id);

    if (profileError) {
      console.error("[equipe suspend] update profile:", profileError);
      // Rollback best effort : sinon auth et profil divergent
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.updateUserById(member_id, {
          ban_duration: shouldSuspend ? BAN_NONE : BAN_FOREVER,
        });
      if (rollbackError) {
        console.error("[equipe suspend] rollback ban:", rollbackError);
      }
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    revalidatePath("/admin/equipe");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
