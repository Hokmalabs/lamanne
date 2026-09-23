/**
 * Gardes communes aux routes de gestion de l'équipe (app/api/admin/equipe/**).
 *
 * Centralise la question « cet appelant a-t-il le droit d'agir sur ce compte ? »
 * pour que les 4 routes appliquent exactement les mêmes règles, dans le même
 * ordre. Toute divergence entre routes serait un trou de sécurité.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ApiError, type AuthContext, type Role } from "@/lib/api-security";

export type TeamAction =
  | "change_role"
  | "suspend"
  | "reactivate"
  | "regenerate_password"
  | "delete";

export type TeamTarget = {
  id: string;
  role: Role;
  is_suspended: boolean;
};

/**
 * Charge le profil cible et vérifie que `ctx` a le droit d'exécuter `action`
 * dessus. Lance une ApiError explicite au premier refus.
 */
export async function loadManageableTarget(
  ctx: AuthContext,
  targetId: string,
  action: TeamAction,
): Promise<TeamTarget> {
  const { data: target, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role, is_suspended")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    console.error("[equipe-guards] read profile:", error);
    throw new ApiError(500, "Erreur de lecture", "INTERNAL");
  }

  if (!target) {
    throw new ApiError(404, "Membre introuvable", "NOT_FOUND");
  }

  // 1. Jamais sur soi-même : évite l'auto-suspension et l'auto-rétrogradation
  if (targetId === ctx.user.id) {
    throw new ApiError(400, "Action impossible sur votre propre compte", "INVALID_INPUT");
  }

  // 2. Un super_admin n'est modifiable par personne via cette API
  if (target.role === "super_admin") {
    throw new ApiError(403, "Ce compte ne peut pas être modifié", "FORBIDDEN");
  }

  // 3. Ces routes ne gèrent que l'équipe, pas les clients
  if (target.role === "user") {
    throw new ApiError(403, "Ce compte n'est pas un membre de l'équipe", "FORBIDDEN");
  }

  // 4. La suppression est réservée au super_admin
  if (action === "delete" && ctx.profile.role !== "super_admin") {
    throw new ApiError(403, "Suppression réservée au super admin", "FORBIDDEN");
  }

  // 5. Un admin ne gère que les commerciaux
  if (ctx.profile.role === "admin" && target.role !== "commercial") {
    throw new ApiError(403, "Seul le super admin peut gérer un administrateur", "FORBIDDEN");
  }

  return {
    id: target.id as string,
    role: target.role as Role,
    is_suspended: Boolean(target.is_suspended),
  };
}
