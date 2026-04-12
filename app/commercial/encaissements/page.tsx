import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { Wallet, Clock, CalendarDays, TrendingUp } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import EncaissementsContent from "./EncaissementsContent";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type RecentPayment = {
  id: string;
  amount: number;
  paid_at: string;
  client_name: string;
  product_name: string;
};

export default async function EncaissementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const commercialId = user.id;
  console.log("[Encaissements] commercialId:", commercialId);

  // 1. Clients assigned to this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name, phone")
    .eq("assigned_commercial", commercialId)
    .eq("role", "user")
    .order("full_name");

  const clientIds = (clients ?? []).map((c) => c.id);
  console.log("[Encaissements] clientIds:", clientIds);

  // 2. All cotisations for these clients
  let cotisations: any[] = [];
  let cotIds: string[] = [];

  if (clientIds.length > 0) {
    const { data: allCots } = await admin
      .from("cotisations")
      .select("id, user_id, amount_paid, total_price, status, products(name, price, images)")
      .in("user_id", clientIds)
      .order("created_at", { ascending: false });

    cotIds = (allCots ?? []).map((c) => c.id);

    cotisations = (allCots ?? [])
      .filter((c) => c.status === "active")
      .map((c) => {
        const product = Array.isArray(c.products) ? c.products[0] : c.products;
        const client = (clients ?? []).find((cl) => cl.id === c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          amount_paid: c.amount_paid as number,
          total_price: c.total_price as number,
          product_name: (product as any)?.name ?? "—",
          product_price: (product as any)?.price ?? (c.total_price as number),
          client_name: client?.full_name ?? "—",
          client_phone: client?.phone ?? null,
        };
      });
  }

  // === Date boundaries ===
  const now = new Date();

  // Today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Start of current week (Monday)
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekISO = weekStart.toISOString();

  // Start of current month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthISO = monthStart.toISOString();

  // Last 7 calendar days (for the list)
  const last7Start = new Date(now);
  last7Start.setDate(last7Start.getDate() - 6); // today + 6 days back = 7 days
  last7Start.setHours(0, 0, 0, 0);
  const last7ISO = last7Start.toISOString();

  // === Totals ===
  let totalToday = 0;
  let nbToday = 0;
  let totalWeek = 0;
  let totalMonth = 0;
  let recentPayments: RecentPayment[] = [];

  if (cotIds.length > 0) {
    // Single query: all payments since start of month (covers today + week + month)
    const { data: monthPayments } = await admin
      .from("payments")
      .select("id, amount, paid_at, cotisation_id")
      .in("cotisation_id", cotIds)
      .gte("paid_at", monthISO)
      .order("paid_at", { ascending: false });

    console.log("[Encaissements] monthPayments count:", monthPayments?.length);

    totalMonth = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

    const todayMs = todayStart.getTime();
    const weekMs = weekStart.getTime();

    for (const p of monthPayments ?? []) {
      const t = new Date(p.paid_at).getTime();
      if (t >= weekMs) totalWeek += p.amount ?? 0;
      if (t >= todayMs) { totalToday += p.amount ?? 0; nbToday++; }
    }

    console.log("[Encaissements] today:", totalToday, "week:", totalWeek, "month:", totalMonth);

    // For the list: payments from last 7 days (may include days before month start in edge cases)
    // If month start is within last 7 days, monthPayments already covers it.
    // Otherwise fetch a separate query for the previous month overlap.
    let listPayments = (monthPayments ?? []).filter(
      (p) => new Date(p.paid_at).getTime() >= last7Start.getTime()
    );

    if (last7Start < monthStart) {
      // Fetch overlap from previous month
      const { data: prevMonthPayments } = await admin
        .from("payments")
        .select("id, amount, paid_at, cotisation_id")
        .in("cotisation_id", cotIds)
        .gte("paid_at", last7ISO)
        .lt("paid_at", monthISO)
        .order("paid_at", { ascending: false });

      listPayments = [...listPayments, ...(prevMonthPayments ?? [])].sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime()
      );
    }

    if (listPayments.length > 0) {
      // Build cotisation → client/product maps
      const cotProductMap: Record<string, string> = {};
      const cotClientMap: Record<string, string> = {};

      cotisations.forEach((c) => {
        cotProductMap[c.id] = c.product_name;
        cotClientMap[c.id] = c.client_name;
      });

      // Fill missing (completed cotisations not in active list)
      const seenCotIds = Array.from(new Set(listPayments.map((p) => p.cotisation_id)));
      const missing = seenCotIds.filter((id) => !cotProductMap[id]);
      if (missing.length > 0) {
        const { data: extraCots } = await admin
          .from("cotisations")
          .select("id, user_id, products(name)")
          .in("id", missing);
        (extraCots ?? []).forEach((c) => {
          const p = Array.isArray(c.products) ? c.products[0] : c.products;
          cotProductMap[c.id] = (p as any)?.name ?? "—";
          const cl = (clients ?? []).find((cl) => cl.id === c.user_id);
          cotClientMap[c.id] = cl?.full_name ?? "—";
        });
      }

      recentPayments = listPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paid_at: p.paid_at,
        client_name: cotClientMap[p.cotisation_id] ?? "—",
        product_name: cotProductMap[p.cotisation_id] ?? "—",
      }));
    }
  }

  const dateLabel = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Encaissements</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{dateLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div
          className="bg-[#0D3B8C] text-white rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <Wallet className="h-5 w-5 mb-2 opacity-70" />
          <p className="text-2xl font-black">{formatCFA(totalToday)}</p>
          <p className="text-white/70 text-sm mt-0.5">Aujourd&apos;hui</p>
        </div>
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <Clock className="h-5 w-5 mb-2 text-gray-400" />
          <p className="text-2xl font-black text-gray-900">{nbToday}</p>
          <p className="text-gray-500 text-sm mt-0.5">Versements aujourd&apos;hui</p>
        </div>
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <CalendarDays className="h-5 w-5 mb-2 text-[#378ADD]" />
          <p className="text-2xl font-black text-gray-900">{formatCFA(totalWeek)}</p>
          <p className="text-gray-500 text-sm mt-0.5">Cette semaine</p>
        </div>
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <TrendingUp className="h-5 w-5 mb-2 text-[#2D9B6F]" />
          <p className="text-2xl font-black text-gray-900">{formatCFA(totalMonth)}</p>
          <p className="text-gray-500 text-sm mt-0.5">Ce mois</p>
        </div>
      </div>

      {/* Recent payments list — last 7 days */}
      {recentPayments.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Versements des 7 derniers jours</h2>
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-50">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0D3B8C] font-bold text-xs">
                      {p.client_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.client_name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.product_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.paid_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(p.paid_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Client</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Produit</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-500">Date</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.client_name}</td>
                    <td className="px-5 py-3 text-gray-500">{p.product_name}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(p.paid_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      {new Date(p.paid_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-right font-black text-[#0D3B8C]">
                      {formatCFA(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EncaissementsContent cotisations={cotisations} />
    </div>
  );
}
