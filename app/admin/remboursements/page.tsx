"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatCFA, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

type Row = {
  id: string;
  refund_amount: number;
  refund_status: string;
  refund_requested_at: string | null;
  cancellation_reason: string | null;
  product: { name: string };
  profile: { full_name: string };
};

export default function AdminRemboursementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("cotisations")
      .select("id, refund_amount, refund_status, refund_requested_at, cancellation_reason, product:products(name), profile:profiles(full_name)")
      .eq("refund_status", "requested")
      .order("refund_requested_at", { ascending: true });

    if (data) setRows(data as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    setProcessingId(id);
    await supabase
      .from("cotisations")
      .update({ refund_status: decision })
      .eq("id", id);

    // Notification à l'utilisateur
    const row = rows.find((r) => r.id === id);
    if (row) {
      const { data: cotisation } = await supabase
        .from("cotisations")
        .select("user_id")
        .eq("id", id)
        .single();

      if (cotisation) {
        await supabase.from("notifications").insert({
          user_id: cotisation.user_id,
          title: decision === "approved" ? "Remboursement approuvé" : "Remboursement refusé",
          message:
            decision === "approved"
              ? `Votre remboursement de ${formatCFA(row.refund_amount)} pour "${row.product?.name}" a été approuvé.`
              : `Votre demande de remboursement pour "${row.product?.name}" a été refusée.`,
          type: decision === "approved" ? "success" : "warning",
        });
      }
    }

    await fetchData();
    setProcessingId(null);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Remboursements</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {loading ? "Chargement..." : `${rows.length} demande(s) en attente`}
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <RefreshCw className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">Aucune demande en attente</p>
          <p className="text-sm text-gray-400 mt-1">
            Les demandes de remboursement apparaîtront ici.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
            >
              {/* En-tête */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">{row.profile?.full_name ?? "—"}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{row.product?.name ?? "—"}</p>
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

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleDecision(row.id, "rejected")}
                  disabled={processingId === row.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
                <Button
                  className="flex-1 bg-lamanne-success hover:bg-lamanne-success/90"
                  onClick={() => handleDecision(row.id, "approved")}
                  disabled={processingId === row.id}
                >
                  {processingId === row.id ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Traitement...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Approuver
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
