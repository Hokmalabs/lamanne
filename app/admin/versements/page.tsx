export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils";
import { requirePageAuth } from "@/lib/api-security";
import { ExportButton } from "./ExportButton";

const methodLabel: Record<string, string> = {
  cash: "Cash",
  online: "En ligne",
};
const statusColor: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-600",
};
const statusLabel: Record<string, string> = {
  success: "Validé",
  pending: "En attente",
  failed: "Échec",
};

const PAGE_SIZE = 50;

type SearchParams = {
  period?: string;
  method?: string;
  status?: string;
  commercial?: string;
  search?: string;
  page?: string;
};

export default async function AdminVersementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePageAuth(["admin", "super_admin"]);
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const params = await searchParams;
  const period = params.period || "all";
  const method = params.method || "all";
  const status = params.status || "all";
  const commercialId = params.commercial || "all";
  const search = (params.search ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let startDate: Date | null = null;
  const now = new Date();
  if (period === "today") {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === "30d") {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  }

  let query = admin
    .from("payments")
    .select(
      "id, amount, paid_at, created_at, status, payment_method, transaction_ref, user_id, cotisation_id",
      { count: "exact" }
    );

  if (startDate) {
    query = query.gte("paid_at", startDate.toISOString());
  }
  if (method !== "all") {
    query = query.eq("payment_method", method);
  }
  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.ilike("transaction_ref", `%${search}%`);
  }

  query = query
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: rawPayments, count } = await query;

  const enriched = await Promise.all(
    (rawPayments ?? []).map(async (p) => {
      const [{ data: clientProfile }, { data: cot }] = await Promise.all([
        admin
          .from("profiles")
          .select("full_name, phone")
          .eq("id", p.user_id)
          .single(),
        admin
          .from("cotisations")
          .select("created_by, products(name)")
          .eq("id", p.cotisation_id)
          .single(),
      ]);

      let commercialName: string | null = null;
      if (cot?.created_by) {
        const { data: c } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", cot.created_by)
          .single();
        commercialName = c?.full_name ?? null;
      }

      const rawProduct = cot?.products;
      const productObj: { name: string } | null =
        Array.isArray(rawProduct) ? rawProduct[0] ?? null : (rawProduct ?? null);
      const productName = productObj?.name ?? null;

      return {
        ...p,
        client: clientProfile,
        productName,
        commercialName,
        commercialId: cot?.created_by ?? null,
      };
    })
  );

  let filtered = enriched;
  if (commercialId !== "all") {
    filtered = filtered.filter((p) => p.commercialId === commercialId);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.client?.full_name ?? "").toLowerCase().includes(s) ||
        (p.client?.phone ?? "").includes(s) ||
        (p.transaction_ref ?? "").toLowerCase().includes(s)
    );
  }

  const { data: commercials } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("role", "commercial")
    .eq("is_suspended", false)
    .order("full_name");

  const totalAmount = filtered.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalCount = filtered.length;

  const buildHref = (overrides: Partial<SearchParams & { page: string }>) => {
    const merged = {
      period,
      method,
      status,
      commercial: commercialId,
      search,
      page: "1",
      ...overrides,
    };
    const qs = Object.entries(merged)
      .filter(([, v]) => v && v !== "all" && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join("&");
    return qs ? `/admin/versements?${qs}` : "/admin/versements";
  };

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const exportQs = Object.entries({
    period,
    method,
    status,
    commercial: commercialId,
    search,
  })
    .filter(([, v]) => v && v !== "all" && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Versements</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Historique de tous les paiements
          </p>
        </div>
        <ExportButton query={exportQs} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-white rounded-2xl p-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <p className="text-xs text-gray-400">Total encaissé (filtré)</p>
          <p className="text-2xl font-black text-[#0D3B8C] mt-1">
            {formatCFA(totalAmount)}
          </p>
        </div>
        <div
          className="bg-white rounded-2xl p-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <p className="text-xs text-gray-400">Nombre de versements (filtré)</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalCount}</p>
        </div>
      </div>

      {/* Filtres période */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Tout", value: "all" },
          { label: "Aujourd'hui", value: "today" },
          { label: "7 jours", value: "7d" },
          { label: "30 jours", value: "30d" },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={buildHref({ period: value })}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              period === value
                ? "bg-[#0D3B8C] text-white border-[#0D3B8C]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Filtres méthode + statut + commercial + search */}
      <form
        method="get"
        action="/admin/versements"
        className="bg-white rounded-2xl p-4 space-y-3"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <input type="hidden" name="period" value={period} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Méthode
            </label>
            <select
              name="method"
              defaultValue={method}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mt-1"
            >
              <option value="all">Toutes</option>
              <option value="cash">Cash</option>
              <option value="online">En ligne</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Statut
            </label>
            <select
              name="status"
              defaultValue={status}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mt-1"
            >
              <option value="all">Tous</option>
              <option value="success">Validé</option>
              <option value="pending">En attente</option>
              <option value="failed">Échec</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Commercial
            </label>
            <select
              name="commercial"
              defaultValue={commercialId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mt-1"
            >
              <option value="all">Tous</option>
              {(commercials ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">
              Recherche
            </label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Nom, téléphone, réf..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#0D3B8C] text-white hover:opacity-90"
          >
            Appliquer
          </button>
          <Link
            href="/admin/versements"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Réinitialiser
          </Link>
        </div>
      </form>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 text-gray-400 bg-white rounded-2xl"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <p>Aucun versement trouvé</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((p: any) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-bold text-gray-900">
                      {p.client?.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.client?.phone ?? ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      statusColor[p.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabel[p.status] ?? p.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{p.productName ?? "—"}</p>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-lg font-black text-[#0D3B8C]">
                      {formatCFA(p.amount)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {methodLabel[p.payment_method] ?? p.payment_method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {formatDate(p.paid_at ?? p.created_at)}
                    </p>
                    {p.commercialName && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        par {p.commercialName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div
            className="hidden md:block bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Date
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Client
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Produit
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Montant
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Méthode
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Statut
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Commercial
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">
                    Référence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-gray-700 text-xs">
                      {formatDate(p.paid_at ?? p.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">
                        {p.client?.full_name ?? "—"}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {p.client?.phone ?? ""}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {p.productName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[#0D3B8C]">
                      {formatCFA(p.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {methodLabel[p.payment_method] ?? p.payment_method}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusColor[p.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {p.commercialName ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">
                      {p.transaction_ref ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between bg-white rounded-2xl px-5 py-3"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Précédent
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-[#0D3B8C] text-white hover:opacity-90"
                  >
                    Suivant
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
