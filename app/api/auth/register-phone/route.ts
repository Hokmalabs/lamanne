import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin, validateInput, handleApiError } from "@/lib/api-security";
import { createClientAccount } from "@/lib/client-accounts";
import { openSessionForEmail } from "@/lib/phone-session";

export const dynamic = "force-dynamic";

// Tout autre champ (role, referral_code_used…) est retiré par Zod
const schema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Nom trop long (100 caractères maximum)"),
  phone: z.string().min(1, "Numéro requis").max(30, "Numéro trop long"),
  pin: z.string().max(10, "Code PIN invalide"),
});

/**
 * Inscription libre d'un client (route PUBLIQUE).
 * Le client choisit son PIN ; la session est ouverte dans la foulée.
 */
export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    const { full_name, phone, pin } = validateInput(schema, await req.json());

    const { loginEmail } = await createClientAccount({
      fullName: full_name,
      rawPhone: phone,
      createdBy: null,
      assignedCommercial: null,
      pinMode: { kind: "chosen", pin },
    });

    // Le compte existe quoi qu'il arrive : un échec de session n'annule rien,
    // le client pourra se connecter normalement
    let session = true;
    try {
      await openSessionForEmail(loginEmail);
    } catch (e) {
      console.error("[register-phone] ouverture de session:", e);
      session = false;
    }

    return NextResponse.json({ ok: true, session }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
