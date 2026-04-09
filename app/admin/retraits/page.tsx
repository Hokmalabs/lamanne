import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatCFA, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PackageCheck, CheckCircle } from "lucide-react";
import Link from "next/link";
import { ValidateButton } from "./ValidateButton";

type Tab = "pending" | "done";

export default async function AdminRetraitsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = (searchParams.tab as Tab) || "pending";

  // Debug simple sans JOIN
  const { data: simpleData, error: simpleError } = await supabaseAdmin
    .from("cotisations")
    .select("id, status, withdrawn_at")
    .eq("status", "completed");
  console.log("[Admin Retraits simple] count:", simpleData?.length, "| error:", simpleError?.message);

  const [{ data: pending, error: pendingError }, { data: done, error: doneError }] = await Promise.all([
    supabaseAdmin
      .from("cotisations")
      .select("*, profiles(full_name, phone), products(name)")
      .eq("status", "completed")
      .is("withdrawn_at", null)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("cotisations")
      .select("*, profiles(full_name, phone), products(name)")
      .eq("status", "completed")
      .not("withdrawn_at", "is", null)
      .order("withdrawn_at", { ascending: false })
      .limit(50),
  ]);

  console.log("[Admin Retraits] pending:", pending?.length, "| error:", pendingError?.message);
  console.log("[Admin Retraits] done:", done?.length, "| error:", doneError?.message);

  const current = tab === "pending" ? (pending ?? []) : (done ?? []);

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
          { key: "pending" as Tab, label: `En attente (${pending?.length ?? 0})` },
          { key: "done"    as Tab, label: `Validés (${done?.length ?? 0})` },
        ]).map(({ key, label }) => (
          <Link
            key={key}
            href={key === "pending" ? "/admin/retraits" : "/admin/retraits?tab=done"}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all text-center",
              tab === key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <PackageCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">
            {tab === "pending" ? "Aucun retrait en attente" : "Aucun retrait validé"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {current.map((row: any) => (
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
                  <p className="font-bold text-gray-900">{row.profiles?.full_name ?? "—"}</p>
                  {row.profiles?.phone && (
                    <p className="text-xs text-gray-400">{row.profiles.phone}</p>
                  )}
                  <p className="text-sm text-gray-500">{row.products?.name ?? "—"}</p>
                  <p className="text-sm font-semibold text-lamanne-primary">
                    {formatCFA(row.total_price)}
                  </p>
                </div>

                {/* Code */}
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-gray-400 mb-1">Code de retrait</p>
                  <p className="text-2xl font-black text-lamanne-primary tracking-widest bg-lamanne-light px-4 py-2 rounded-xl">
                    {row.withdrawal_code ?? "—"}
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
                  <ValidateButton id={row.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
