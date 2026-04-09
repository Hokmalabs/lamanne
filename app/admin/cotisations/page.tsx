import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatCFA, formatDate, calculateProgress } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

type Filter = "all" | "active" | "completed" | "cancelled";

const statusColors: Record<string, string> = {
  active:    "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabels: Record<string, string> = {
  active: "En cours", completed: "Terminé", cancelled: "Annulé",
};

const filters: { key: Filter; label: string }[] = [
  { key: "all",       label: "Toutes" },
  { key: "active",    label: "En cours" },
  { key: "completed", label: "Terminées" },
  { key: "cancelled", label: "Annulées" },
];

export default async function AdminCotisationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = (searchParams.filter as Filter) || "all";

  let query = supabaseAdmin
    .from("cotisations")
    .select("*, profiles(full_name, phone), products(name, price)")
    .order("created_at", { ascending: false });

  if (filter !== "all") query = query.eq("status", filter);

  const { data: rows, error } = await query;

  if (error) console.error("[Admin Cotisations] fetch error:", error.message);

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Cotisations</h1>
        <p className="text-gray-500 text-sm mt-0.5">{rows?.length ?? 0} cotisation(s)</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "all" ? "/admin/cotisations" : `/admin/cotisations?filter=${key}`}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all",
              filter === key
                ? "bg-lamanne-primary text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-lamanne-accent"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {!rows || rows.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Aucune cotisation</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Produit</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Payé</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-32">Progression</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row: any) => {
                  const progress = calculateProgress(row.amount_paid, row.total_price);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{row.profiles?.full_name ?? "—"}</p>
                        {row.profiles?.phone && (
                          <p className="text-xs text-gray-400">{row.profiles.phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                        {row.products?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatCFA(row.amount_paid)}
                        <span className="block text-xs text-gray-400 font-normal">
                          / {formatCFA(row.total_price)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={progress} className="w-20" />
                          <span className="text-xs text-gray-500">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabels[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
