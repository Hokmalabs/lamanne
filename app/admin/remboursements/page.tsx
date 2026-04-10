export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { RemboursementActions } from "./RemboursementActions";

export default async function AdminRemboursementsPage() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await admin
    .from("cotisations")
    .select(`
      id, refund_amount, refund_status, refund_requested_at, cancellation_reason,
      amount_paid, total_price,
      profiles!cotisations_user_id_fkey(full_name, phone),
      products!cotisations_product_id_fkey(name)
    `)
    .eq("refund_status", "requested")
    .order("refund_requested_at", { ascending: false });

  console.log("[Admin Remboursements] count:", rows?.length, "error:", error?.message);

  const formatFCFA = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Remboursements</h1>
      <p className="text-gray-500 mb-6">{rows?.length ?? 0} demande(s) en attente</p>

      {!rows || rows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{error ? `Erreur : ${error.message}` : "Aucune demande de remboursement en attente"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row: any) => (
            <div
              key={row.id}
              className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{row.profiles?.full_name ?? "—"}</p>
                  {row.profiles?.phone && (
                    <p className="text-xs text-gray-400">{row.profiles.phone}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">{row.products?.name ?? "—"}</p>
                  {row.refund_requested_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Demande du {new Date(row.refund_requested_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-green-600">
                    {formatFCFA(row.refund_amount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400">à rembourser</p>
                </div>
              </div>

              {row.cancellation_reason && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-700">Motif : </span>
                  {row.cancellation_reason}
                </div>
              )}

              <RemboursementActions id={row.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
