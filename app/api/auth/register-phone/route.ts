import { NextResponse } from "next/server";
import { z } from "zod";
import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  checkOrigin,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

const schema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  phone: z
    .string()
    .regex(
      /^\+\d{10,15}$/,
      "Numéro de téléphone invalide (format attendu : +225...)",
    ),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
});

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = validateInput(schema, await request.json());

    const { full_name, phone } = body;
    const pin = body.pin ?? randomInt(1000, 10000).toString();

    const digits = phone.replace(/\D/g, "");
    const email = `phone_${digits}@lamanne.app`;

    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pin + "LM",
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        createError.status === 422
      ) {
        throw new ApiError(
          409,
          "Ce numéro de téléphone est déjà utilisé",
          "INVALID_INPUT",
        );
      }
      throw createError;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
