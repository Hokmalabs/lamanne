import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatCFA, formatDate } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { RemboursementActions } from "./RemboursementActions";

export default async function AdminRemboursementsPage() {
  // Debug simple sans JOIN
  const { data: simpleData, error: simpleError } = await supabaseAdmin
    .from("cotisations")
    .select("id, refund_status")
    .eq("refund_status", "requested");
  console.log("[Admin Remboursements simple] count:", simpleData?.length, "| error:", simpleError?.message);

  const { data: rows, error } = await supabaseAdmin
    .from("cotisations")
    .select("*, profiles(full_name, phone), products(name)")
    .eq("refund_status", "requested")
    .order("refund_requested_at", { ascending: false });

  console.log("[Admin Remboursements] count:", rows?.length, "| error:", error?.message);
  console.log("[Admin Remboursements] sample:", JSON.stringify(rows?.slice(0, 2)));

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Remboursements</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {rows?.length ?? 0} demande(s) en attente
        </p>
      </div>

      {!rows || rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">Aucune demande en attente</p>
          <p className="text-sm text-gray-400 mt-1">
            Les demandes de remboursement apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
            >
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{row.profiles?.full_name ?? "—"}</p>
                  {row.profiles?.phone && (
                    <p className="text-xs text-gray-400">{row.profiles.phone}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-0.5">{row.products?.name ?? "—"}</p>
                  {row.refund_requested_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      Demande du {formatDate(row.refund_requested_at)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-lamanne-success">
                    {formatCFA(row.refund_amount ?? 0)}
                  </p>
                  <p className="text-xs text-gray-400">à rembourser</p>
                </div>
              </div>

              {/* Motif */}
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
