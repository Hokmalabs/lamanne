export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

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
    .select(`
      id, status, amount_paid, amount_remaining, total_price,
      nb_tranches, created_at, deadline, refund_status,
      profiles!cotisations_user_id_fkey(full_name, phone),
      products!cotisations_product_id_fkey(name, price)
    `)
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: cotisations, error } = await query;

  console.log("[Admin Cotisations] count:", cotisations?.length, "error:", error?.message);

  const formatFCFA = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

  const statusLabel: Record<string, string> = {
    active: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  };

  const statusColor: Record<string, string> = {
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Cotisations</h1>
      <p className="text-gray-500 mb-6">{cotisations?.length ?? 0} cotisation(s)</p>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { label: "Toutes", value: "all" },
          { label: "En cours", value: "active" },
          { label: "Terminées", value: "completed" },
          { label: "Annulées", value: "cancelled" },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={value !== "all" ? `/admin/cotisations?filter=${value}` : "/admin/cotisations"}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              (filter ?? "all") === value
                ? "bg-lamanne-primary text-white border-lamanne-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tableau */}
      {!cotisations || cotisations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{error ? `Erreur : ${error.message}` : "Aucune cotisation"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Produit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Progression</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Montant payé</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {cotisations.map((c: any) => {
                  const progress = Math.round((c.amount_paid / c.total_price) * 100);
                  return (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.profiles?.full_name ?? "—"}</p>
                        <p className="text-gray-400 text-xs">{c.profiles?.phone ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.products?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-2 rounded-full bg-lamanne-primary"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatFCFA(c.amount_paid)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(c.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
