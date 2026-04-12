export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const statusColor: Record<string, string> = {
  active: "bg-[#E8F1FB] text-[#0D3B8C]",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

export default async function AdminCotisationsPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const filter = searchParams?.filter;

  let query = admin
    .from("cotisations")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: raw } = await query;

  const cotisations = await Promise.all(
    (raw ?? []).map(async (c) => {
      const [{ data: profile }, { data: product }] = await Promise.all([
        admin.from("profiles").select("full_name, phone").eq("id", c.user_id).single(),
        admin.from("products").select("name, price").eq("id", c.product_id).single(),
      ]);
      return { ...c, profile, product };
    })
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Cotisations</h1>
        <p className="text-gray-400 text-sm mt-0.5">{cotisations.length} cotisation(s)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Toutes", value: "all" },
          { label: "En cours", value: "active" },
          { label: "Terminées", value: "completed" },
          { label: "Annulées", value: "cancelled" },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={value !== "all" ? `/admin/cotisations?filter=${value}` : "/admin/cotisations"}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              (filter ?? "all") === value
                ? "bg-[#0D3B8C] text-white border-[#0D3B8C]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {cotisations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl" style={{ boxShadow: "var(--shadow-sm)" }}>
          <p>Aucune cotisation</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {cotisations.map((c: any) => {
              const progress = Math.round((c.amount_paid / c.total_price) * 100);
              return (
                <div key={c.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{c.profile?.full_name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{c.profile?.phone ?? ""}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{c.product?.name ?? "—"}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#0D3B8C]" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-9 text-right">{progress}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-semibold text-gray-800">{formatCFA(c.amount_paid)}</span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Produit</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Progression</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Montant</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Statut</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cotisations.map((c: any) => {
                  const progress = Math.round((c.amount_paid / c.total_price) * 100);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">{c.profile?.full_name ?? "—"}</p>
                        <p className="text-gray-400 text-xs">{c.profile?.phone ?? ""}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{c.product?.name ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#0D3B8C]" style={{ width: `${Math.min(100, progress)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium">{formatCFA(c.amount_paid)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
