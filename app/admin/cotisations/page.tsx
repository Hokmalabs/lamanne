export const dynamic = "force-dynamic";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { formatCFA, formatDate } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePageAuth } from "@/lib/api-security";

const statusLabel: Record<string, string> = {
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const statusColor: Record<string, string> = {
  active: "bg-lamanne-soft text-lamanne-primary",
  completed: "bg-lamanne-success/10 text-lamanne-success",
  cancelled: "bg-lamanne-danger/10 text-lamanne-danger",
};

type Profile = { id: string; full_name: string | null; phone: string | null };

type ProductRelation = { name: string; price: number };

type Cotisation = {
  id: string;
  user_id: string;
  status: string;
  amount_paid: number;
  total_price: number;
  created_at: string;
  products?: ProductRelation | ProductRelation[] | null;
};

type CotisationRow = Cotisation & {
  profile: Profile | null;
  product: ProductRelation | null;
  progress: number;
};

// PostgREST renvoie un objet ou un tableau selon la relation — même normalisation
// que app/api/admin/remboursements/[id]/route.ts
function pickOne<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

export default async function AdminCotisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePageAuth(["admin", "super_admin"]);

  const params = await searchParams;
  const filter = params?.filter;

  let query = supabaseAdmin
    .from("cotisations")
    .select("*, products(name, price)")
    .order("created_at", { ascending: false });

  if (filter && filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data: raw } = await query;
  const rows = (raw ?? []) as Cotisation[];

  // cotisations.user_id référence auth.users (pas profiles) : aucun embed PostgREST
  // possible vers profiles. Une seule requête groupée remplace le N+1.
  const userIds = Array.from(new Set(rows.map((c) => c.user_id)));
  const profilesById = new Map<string, Profile>();

  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    for (const p of (profilesData ?? []) as Profile[]) {
      profilesById.set(p.id, p);
    }
  }

  const cotisations: CotisationRow[] = rows.map((c) => ({
    ...c,
    profile: profilesById.get(c.user_id) ?? null,
    product: pickOne<ProductRelation>(c.products),
    // Garde contre la division par zéro (total_price nul, absent ou négatif)
    progress:
      c.total_price > 0 ? Math.round((c.amount_paid / c.total_price) * 100) : 0,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Cotisations</h1>
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
            className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              (filter ?? "all") === value
                ? "bg-lamanne-primary text-white border-lamanne-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {cotisations.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl" style={{ boxShadow: "var(--shadow-sm)" }}>
          <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Aucune cotisation</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {cotisations.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-sora font-bold text-gray-900 truncate">{c.profile?.full_name ?? "—"}</p>
                    <p className="text-xs text-gray-400 truncate">{c.profile?.phone ?? ""}</p>
                    <p className="text-sm text-gray-600 mt-0.5 truncate">{c.product?.name ?? "—"}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 min-w-0 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full progress-bar-fill" style={{ width: `${Math.min(100, c.progress)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-9 text-right flex-shrink-0">{c.progress}%</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
                  <span className="font-sora font-semibold text-gray-800 flex-shrink-0">{formatCFA(c.amount_paid)}</span>
                  <span className="truncate">{formatDate(c.created_at)}</span>
                </div>
              </div>
            ))}
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
                {cotisations.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{c.profile?.full_name ?? "—"}</p>
                      <p className="text-gray-400 text-xs">{c.profile?.phone ?? ""}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{c.product?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                          <div className="h-full rounded-full progress-bar-fill" style={{ width: `${Math.min(100, c.progress)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600">{c.progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-sora font-medium">{formatCFA(c.amount_paid)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
