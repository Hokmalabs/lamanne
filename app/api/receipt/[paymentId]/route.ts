import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/components/receipt-pdf";
import React from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  requireAuth,
  validateInput,
  handleApiError,
  ApiError,
} from "@/lib/api-security";

const ParamsSchema = z.object({
  paymentId: z.string().uuid("Identifiant de versement invalide"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const ctx = await requireAuth(_req);
    const { paymentId } = validateInput(ParamsSchema, await params);

    // 1. Récupérer le paiement
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, amount, paid_at, cotisation_id, user_id")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new ApiError(404, "Versement introuvable", "NOT_FOUND");
    }

    // 2. Récupérer la cotisation + produit (created_by nécessaire pour l'authz commercial)
    const { data: cotisation } = await supabaseAdmin
      .from("cotisations")
      .select("id, amount_paid, total_price, created_by, products(name)")
      .eq("id", payment.cotisation_id)
      .single();

    // 3. Récupérer le profil client (assigned_commercial nécessaire pour l'authz)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone, assigned_commercial")
      .eq("id", payment.user_id)
      .single();

    // Vérification d'autorisation
    const role = ctx.profile.role;
    const userId = ctx.user.id;

    const isOwner = payment.user_id === userId;
    const isAdmin = role === "admin" || role === "super_admin";
    const isAssignedCommercial =
      role === "commercial" &&
      (cotisation?.created_by === userId ||
        profile?.assigned_commercial === userId);

    if (!isOwner && !isAdmin && !isAssignedCommercial) {
      throw new ApiError(403, "Accès non autorisé", "FORBIDDEN");
    }

    // Construction des données PDF
    const rawProduct = cotisation?.products;
    const product: { name: string } | null =
     Array.isArray(rawProduct) ? rawProduct[0] ?? null : (rawProduct ?? null);

    const data = {
      paymentId: payment.id as string,
      amount: payment.amount as number,
      paidAt: payment.paid_at as string,
      clientName: profile?.full_name ?? "—",
      clientPhone: profile?.phone ?? "",
      productName: product?.name ?? "—",
      amountPaid: (cotisation?.amount_paid as number | undefined) ?? (payment.amount as number),
      totalPrice: (cotisation?.total_price as number | undefined) ?? (payment.amount as number),
    };

    const buffer = await renderToBuffer(
      React.createElement(ReceiptDocument, { data }) as React.ReactElement,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recu-${paymentId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
