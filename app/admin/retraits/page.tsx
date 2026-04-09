"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatCFA, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PackageCheck, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  total_price: number;
  withdrawal_code: string;
  withdrawn_at: string | null;
  created_at: string;
  product: { name: string };
  profile: { full_name: string };
};

type Tab = "pending" | "done";

export default function AdminRetraitsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<Row[]>([]);
  const [done, setDone] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: pendingData }, { data: doneData }] = await Promise.all([
      supabase
        .from("cotisations")
        .select("id, total_price, withdrawal_code, withdrawn_at, created_at, product:products(name), profile:profiles(full_name)")
        .eq("status", "completed")
        .is("withdrawn_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("cotisations")
        .select("id, total_price, withdrawal_code, withdrawn_at, created_at, product:products(name), profile:profiles(full_name)")
        .eq("status", "completed")
        .not("withdrawn_at", "is", null)
        .order("withdrawn_at", { ascending: false })
        .limit(20),
    ]);

    if (pendingData) setPending(pendingData as unknown as Row[]);
    if (doneData) setDone(doneData as unknown as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validateRetrait = async (id: string) => {
    setProcessingId(id);
    await supabase
      .from("cotisations")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("id", id);
    await fetchData();
    setProcessingId(null);
  };

  const current = tab === "pending" ? pending : done;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Retraits</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Validation des retraits en boutique
        </p>
      </div>

      {/* Onglets */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([
          { key: "pending", label: `En attente (${pending.length})` },
          { key: "done",    label: `Validés (${done.length})` },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {!loading && current.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <PackageCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">
            {tab === "pending" ? "Aucun retrait en attente" : "Aucun retrait validé"}
          </p>
        </div>
      )}

      {!loading && current.length > 0 && (
        <div className="space-y-3">
          {current.map((row) => (
            <div
              key={row.id}
              className={cn(
                "bg-white rounded-2xl border shadow-sm p-5",
                tab === "pending" ? "border-lamanne-accent/20" : "border-gray-100"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Infos */}
                <div className="space-y-1">
                  <p className="font-bold text-gray-900">{row.profile?.full_name ?? "—"}</p>
                  <p className="text-sm text-gray-500">{row.product?.name ?? "—"}</p>
                  <p className="text-sm font-semibold text-lamanne-primary">
                    {formatCFA(row.total_price)}
                  </p>
                </div>

                {/* Code */}
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-1">Code de retrait</p>
                  <p className="text-2xl font-black text-lamanne-primary tracking-widest bg-lamanne-light px-4 py-2 rounded-xl">
                    {row.withdrawal_code}
                  </p>
                </div>
              </div>

              {/* Date validation ou action */}
              <div className="mt-4">
                {tab === "done" ? (
                  <div className="flex items-center gap-2 text-sm text-lamanne-success">
                    <CheckCircle className="h-4 w-4" />
                    <span>Validé le {row.withdrawn_at ? formatDate(row.withdrawn_at) : "—"}</span>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => validateRetrait(row.id)}
                    disabled={processingId === row.id}
                  >
                    {processingId === row.id ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Validation...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4" />
                        Valider le retrait
                      </span>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
