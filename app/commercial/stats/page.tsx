import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";
import { formatCFA } from "@/lib/utils";
import CommercialStatsCharts from "./CommercialStatsCharts";
import { TrendingUp, Users, Wallet, Target } from "lucide-react";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function CommercialStatsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const commercialId = user.id;
  console.log("[Stats] commercialId:", commercialId);

  // 1. Commercial profile (for monthly_target)
  const { data: commercialProfile } = await admin
    .from("profiles")
    .select("monthly_target, full_name")
    .eq("id", commercialId)
    .single();

  const objectif = (commercialProfile as any)?.monthly_target ?? 0;
  console.log("[Stats] objectif:", objectif);

  // 2. Clients assigned to this commercial
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("assigned_commercial", commercialId)
    .eq("role", "user");

  const clientIds = (clients ?? []).map((c) => c.id);
  console.log("[Stats] clientIds:", clientIds);

  // === Defaults ===
  let totalMois = 0;
  let nbVersementsMois = 0;
  let clientsActifs = 0;
  let tauxCompletion = 0;
  let chartData: { jour: string; montant: number }[] = [];
  let top3: { name: string; totalMois: number; nbVersements: number }[] = [];

  // Build 7-day chart skeleton upfront (used even with 0 data)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  chartData = last7Days.map((date) => ({
    jour: date.toLocaleDateString("fr-FR", { weekday: "short" }),
    montant: 0,
  }));

  if (clientIds.length > 0) {
    // 3. Get all cotisation IDs for these clients (needed for payment queries)
    const { data: allCots } = await admin
      .from("cotisations")
      .select("id, user_id, status")
      .in("user_id", clientIds);

    const cotIds = (allCots ?? []).map((c) => c.id);
    console.log("[Stats] cotIds count:", cotIds.length);

    // 4. Clients actifs (at least one active cotisation)
    clientsActifs = new Set(
      (allCots ?? []).filter((c) => c.status === "active").map((c) => c.user_id)
    ).size;

    // 5. Taux de complétion (toutes cotisations)
    const terminees = (allCots ?? []).filter((c) => c.status === "completed").length;
    const totalCotis = (allCots ?? []).length;
    tauxCompletion = totalCotis > 0 ? Math.round((terminees / totalCotis) * 100) : 0;
    console.log("[Stats] tauxCompletion:", tauxCompletion, "terminees:", terminees, "total:", totalCotis);

    if (cotIds.length > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthISO = startOfMonth.toISOString();

      // 6. Monthly payments total + count (via cotisation_id + paid_at)
      const { data: monthPayments } = await admin
        .from("payments")
        .select("amount, cotisation_id, paid_at")
        .in("cotisation_id", cotIds)
        .gte("paid_at", startOfMonthISO);

      totalMois = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
      nbVersementsMois = monthPayments?.length ?? 0;
      console.log("[Stats] monthPayments count:", nbVersementsMois, "totalMois:", totalMois);

      // 7. 7-day chart — filter monthly payments by day
      chartData = last7Days.map((date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const startMs = start.getTime();
        const endMs = end.getTime();

        const dayTotal = (monthPayments ?? [])
          .filter((p) => {
            const t = new Date(p.paid_at).getTime();
            return t >= startMs && t <= endMs;
          })
          .reduce((s, p) => s + (p.amount ?? 0), 0);

        return {
          jour: date.toLocaleDateString("fr-FR", { weekday: "short" }),
          montant: dayTotal,
        };
      });

      // Also fetch older payments for days outside this month
      // (7-day window may include last days of previous month)
      const sevenDaysAgo = new Date(last7Days[0]);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      if (sevenDaysAgo < startOfMonth) {
        const { data: olderPayments } = await admin
          .from("payments")
          .select("amount, paid_at")
          .in("cotisation_id", cotIds)
          .gte("paid_at", sevenDaysAgo.toISOString())
          .lt("paid_at", startOfMonthISO);

        if ((olderPayments ?? []).length > 0) {
          chartData = last7Days.map((date) => {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            const startMs = start.getTime();
            const endMs = end.getTime();

            // Combine from both arrays
            const allP = [...(monthPayments ?? []), ...(olderPayments ?? [])];
            const dayTotal = allP
              .filter((p) => {
                const t = new Date(p.paid_at).getTime();
                return t >= startMs && t <= endMs;
              })
              .reduce((s, p) => s + (p.amount ?? 0), 0);

            return {
              jour: date.toLocaleDateString("fr-FR", { weekday: "short" }),
              montant: dayTotal,
            };
          });
        }
      }

      // 8. Top 3 clients this month — build cotisation→client map
      const cotToClient: Record<string, string> = {};
      (allCots ?? []).forEach((c) => {
        const client = (clients ?? []).find((cl) => cl.id === c.user_id);
        cotToClient[c.id] = client?.full_name ?? "—";
      });

      // Aggregate per client
      const clientTotals: Record<string, { name: string; total: number; count: number }> = {};
      (monthPayments ?? []).forEach((p) => {
        const name = cotToClient[p.cotisation_id] ?? "—";
        if (!clientTotals[name]) clientTotals[name] = { name, total: 0, count: 0 };
        clientTotals[name].total += p.amount ?? 0;
        clientTotals[name].count += 1;
      });

      top3 = Object.values(clientTotals)
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((c) => ({ name: c.name, totalMois: c.total, nbVersements: c.count }));

      console.log("[Stats] top3:", top3);
    }
  }

  const progression = objectif > 0 ? Math.min(Math.round((totalMois / objectif) * 100), 100) : 0;

  const stats = [
    { label: "Clients assignés",   value: clientIds.length,         icon: Users,       bg: "#0D3B8C" },
    { label: "Encaissé ce mois",   value: formatCFA(totalMois),     icon: Wallet,      bg: "#2D9B6F" },
    { label: "Clients actifs",     value: clientsActifs,            icon: TrendingUp,  bg: "#378ADD" },
    { label: "Taux complétion",    value: `${tauxCompletion}%`,     icon: Target,      bg: "#F5A623" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mes statistiques</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          {nbVersementsMois} versement{nbVersementsMois !== 1 ? "s" : ""} ce mois
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, bg }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: bg, boxShadow: "var(--shadow-sm)" }}>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-2">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-xs text-white/60 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <CommercialStatsCharts
        chartData={chartData}
        topClients={top3}
        completionRate={tauxCompletion}
        objectif={objectif}
        totalMois={totalMois}
        progression={progression}
      />
    </div>
  );
}
