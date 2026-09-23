import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

// Le numéro est l'identifiant de connexion : il n'est PAS modifiable ici
const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Nom trop long (100 caractères maximum)"),
});

export async function PATCH(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["user"]);
    const { full_name } = validateInput(schema, await req.json());

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name })
      .eq("id", ctx.user.id)
      .select("id");

    if (error) {
      console.error("[client profil] update:", error);
      throw new ApiError(500, "Erreur d'enregistrement", "INTERNAL");
    }
    if (!updated || updated.length === 0) {
      throw new ApiError(404, "Profil introuvable", "NOT_FOUND");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
