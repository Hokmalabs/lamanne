import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/components/receipt-pdf";
import React from "react";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;

  // Fetch payment
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, amount, paid_at, cotisation_id, user_id")
    .eq("id", paymentId)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Versement introuvable" }, { status: 404 });
  }

  // Fetch cotisation + product
  const { data: cotisation } = await admin
    .from("cotisations")
    .select("id, amount_paid, total_price, user_id, products(name)")
    .eq("id", payment.cotisation_id)
    .single();

  // Fetch client profile
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", payment.user_id)
    .single();

  const product = Array.isArray(cotisation?.products)
    ? cotisation!.products[0]
    : cotisation?.products;

  const data = {
    paymentId: payment.id,
    amount: payment.amount,
    paidAt: payment.paid_at,
    clientName: profile?.full_name ?? "—",
    clientPhone: profile?.phone ?? "",
    productName: (product as any)?.name ?? "—",
    amountPaid: cotisation?.amount_paid ?? payment.amount,
    totalPrice: cotisation?.total_price ?? payment.amount,
  };

  const buffer = await renderToBuffer(
    React.createElement(ReceiptDocument, { data }) as any
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${paymentId.slice(0, 8)}.pdf"`,
    },
  });
}
