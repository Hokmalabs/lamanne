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
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Nom trop long (100 caractères maximum)"),
  phone: z.string().min(1, "Numéro requis").max(30, "Numéro trop long"),
  assigned_commercial: z.union([z.uuid("Commercial invalide"), z.literal("")]).optional(),
});

/**
 * Création d'un compte client par un admin, avec assignation optionnelle à
 * un commercial actif. Le PIN temporaire est renvoyé UNE SEULE FOIS ici.
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { full_name, phone, assigned_commercial } = validateInput(
      schema,
      await req.json(),
    );

    const assignedCommercial = assigned_commercial ? assigned_commercial : null;

    if (assignedCommercial) {
      const { data: commercial, error: commercialError } = await supabaseAdmin
        .from("profiles")
        .select("id, role, is_suspended")
        .eq("id", assignedCommercial)
        .maybeSingle();

      if (commercialError) {
        console.error("[AdminClients POST] commercial lookup:", commercialError);
        throw new ApiError(500, "Erreur de vérification", "INTERNAL");
      }
      if (!commercial || commercial.role !== "commercial" || commercial.is_suspended) {
        throw new ApiError(400, "Commercial invalide", "INVALID_INPUT");
      }
    }

    const { userId, tempPin } = await createClientAccount({
      fullName: full_name,
      rawPhone: phone,
      createdBy: ctx.user.id,
      assignedCommercial,
      pinMode: { kind: "temporary" },
    });

    // Le PIN temporaire transite ici et nulle part ailleurs : pas de cache
    return NextResponse.json(
      { ok: true, client_id: userId, temp_pin: tempPin },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
