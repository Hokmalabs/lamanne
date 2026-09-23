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

const ParamsSchema = z.object({
  id: z.uuid("Identifiant de membre invalide"),
});

const PatchSchema = z.object({
  role: z.enum(["user", "commercial", "admin"]),
});

const HISTORY_MESSAGE = "Ce compte a un historique : suspendez-le plutôt";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);
    const { role } = validateInput(PatchSchema, await req.json());

    // Exclut déjà les cibles "user" : aucune promotion depuis un client
    const target = await loadManageableTarget(ctx, id, "change_role");

    if (target.role === role) {
      throw new ApiError(400, "Le membre a déjà ce rôle", "INVALID_INPUT");
    }

    if (role === "admin" && ctx.profile.role !== "super_admin") {
      throw new ApiError(
        403,
        "Seul le super admin peut nommer un administrateur",
        "FORBIDDEN",
      );
    }

    // Rétrograder un commercial en client orphelinerait ses clients assignés
    if (role === "user") {
      const { count, error: countError } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("assigned_commercial", id);

      if (countError) {
        console.error("[equipe PATCH] count assigned:", countError);
        throw new ApiError(500, "Erreur de vérification", "INTERNAL");
      }

      if ((count ?? 0) > 0) {
        throw new ApiError(
          409,
          `Ce commercial a ${count} client(s) assigné(s) : réassignez-les d'abord`,
          "INVALID_INPUT",
        );
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select("id");

    if (updateError) {
      console.error("[equipe PATCH] update role:", updateError);
      throw new ApiError(500, "Erreur de mise à jour", "INTERNAL");
    }

    if (!updated || updated.length === 0) {
      throw new ApiError(404, "Membre introuvable", "NOT_FOUND");
    }

    revalidatePath("/admin/equipe");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { id } = validateInput(ParamsSchema, await params);

    // Réservé au super_admin (vérifié dans la garde)
    await loadManageableTarget(ctx, id, "delete");

    // Un compte rattaché à des données métier n'est jamais supprimé :
    // les FK sont en ON DELETE RESTRICT (voir docs/architecture.md).
    const historyChecks: { label: string; table: string; column: string }[] = [
      { label: "cotisations du membre", table: "cotisations", column: "user_id" },
      { label: "cotisations créées", table: "cotisations", column: "created_by" },
      { label: "versements", table: "payments", column: "user_id" },
      { label: "clients assignés", table: "profiles", column: "assigned_commercial" },
      { label: "comptes créés", table: "profiles", column: "created_by" },
    ];

    for (const check of historyChecks) {
      const { count, error: countError } = await supabaseAdmin
        .from(check.table)
        .select("id", { count: "exact", head: true })
        .eq(check.column, id);

      if (countError) {
        console.error(`[equipe DELETE] count ${check.label}:`, countError);
        throw new ApiError(500, "Erreur de vérification", "INTERNAL");
      }

      if ((count ?? 0) > 0) {
        throw new ApiError(409, HISTORY_MESSAGE, "INVALID_INPUT");
      }
    }

    // Le profil d'abord : si une FK bloque, on n'a rien effacé. L'ordre inverse
    // effacerait le compte auth puis échouerait, laissant un profil orphelin.
    // À l'inverse, un compte auth sans profil est inutilisable (requireAuth
    // renvoie 401), donc cet ordre dégrade proprement.
    const { data: deleted, error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id)
      .select("id");

    if (profileError) {
      console.error("[equipe DELETE] delete profile:", profileError);
      if (profileError.code === "23503") {
        throw new ApiError(409, HISTORY_MESSAGE, "INVALID_INPUT");
      }
      throw new ApiError(500, "Erreur de suppression", "INTERNAL");
    }

    if (!deleted || deleted.length === 0) {
      throw new ApiError(404, "Membre introuvable", "NOT_FOUND");
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      console.error(
        `[equipe DELETE] deleteUser après suppression du profil ${id} :`,
        authError,
      );
      throw new ApiError(
        500,
        "Suppression incomplète : le profil est supprimé mais le compte de connexion subsiste (inutilisable). Voir les logs.",
        "INTERNAL",
      );
    }

    revalidatePath("/admin/equipe");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
