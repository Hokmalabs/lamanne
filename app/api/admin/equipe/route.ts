import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateStaffPassword } from "@/lib/staff-password";
import { normalizeCIPhone, phoneToLoginEmail, PHONE_FORMAT_MESSAGE } from "@/lib/phone";
import {
  requireAuth,
  requireRole,
  validateInput,
  checkOrigin,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Nom trop long (100 caractères maximum)"),
  phone: z
    .string()
    .transform(normalizeCIPhone)
    .refine((phone): phone is string => phone !== null, PHONE_FORMAT_MESSAGE),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email invalide")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "commercial"]),
});

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const ctx = await requireAuth(req);
    requireRole(ctx, ["admin", "super_admin"]);
    const { full_name, phone, email, role } = validateInput(
      CreateSchema,
      await req.json(),
    );

    if (role === "admin" && ctx.profile.role !== "super_admin") {
      throw new ApiError(
        403,
        "Seul le super admin peut créer un administrateur",
        "FORBIDDEN",
      );
    }

    // Email de connexion : celui fourni, sinon un email technique dérivé du numéro
    const resolvedEmail = email ? email : phoneToLoginEmail(phone);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingError) {
      console.error("[equipe POST] phone lookup:", existingError);
      throw new ApiError(500, "Erreur de vérification", "INTERNAL");
    }

    if (existing) {
      throw new ApiError(409, "Ce numéro est déjà utilisé", "INVALID_INPUT");
    }

    // Généré côté serveur, renvoyé une seule fois, jamais stocké
    const password = generateStaffPassword();

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: resolvedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name, phone },
      });

    if (createError) {
      console.error("[equipe POST] createUser:", createError);
      const { message: createMessage, status: createStatus } = createError;
      const alreadyExists =
        createStatus === 422 || /already|registered/i.test(createMessage ?? "");
      if (alreadyExists) {
        throw new ApiError(
          409,
          "Ce numéro ou cet email est déjà utilisé",
          "INVALID_INPUT",
        );
      }
      throw new ApiError(500, "Création impossible", "INTERNAL");
    }

    const memberId = created?.user?.id;
    if (!memberId) {
      console.error("[equipe POST] createUser: aucun utilisateur renvoyé");
      throw new ApiError(500, "Création impossible", "INTERNAL");
    }

    // upsert : un trigger a pu créer le profil à l'insertion dans auth.users
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: memberId,
      full_name,
      phone,
      role,
      created_by: ctx.user.id,
    });

    if (profileError) {
      console.error("[equipe POST] upsert profile:", profileError);
      // Rollback best effort : sans profil, le compte auth est inutilisable
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(memberId);
      if (rollbackError) {
        console.error("[equipe POST] rollback deleteUser:", rollbackError);
      }
      throw new ApiError(
        500,
        "Création impossible, aucun compte n'a été créé",
        "INTERNAL",
      );
    }

    revalidatePath("/admin/equipe");

    // Le mot de passe transite ici et nulle part ailleurs : pas de cache
    return NextResponse.json(
      { ok: true, member_id: memberId, password },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e);
  }
}
