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

  // 1. Commercial profile (for monthly_target)
  const { data: commercialProfile } = await admin
    .from("profiles")
    .select("monthly_target, full_name")
    .eq("id", user.id)
    .single();

  const objectif = (commercialProfile as any)?.monthly_target ?? 0;

  // 2. Clients (role=user)
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("assigned_commercial", user.id)
    .eq("role", "user");

  const clientIds = (clients ?? []).map((c) => c.id);

  // === Defaults ===
  let totalMois = 0;
  let nbVersementsMois = 0;
  let clientsActifs = 0;
  let tauxCompletion = 0;
  let chartData: { jour: string; montant: number }[] = [];
  let top3: { name: string; totalMois: number; nbVersements: number }[] = [];

  if (clientIds.length > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthISO = startOfMonth.toISOString();

    // 3. Monthly payments total + count
    const { data: monthPayments } = await admin
      .from("payments")
      .select("amount")
      .in("user_id", clientIds)
      .eq("status", "success")
      .gte("created_at", startOfMonthISO);

    totalMois = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
    nbVersementsMois = monthPayments?.length ?? 0;

    // 4. Clients actifs (at least one active cotisation)
    const { data: cotisActives } = await admin
      .from("cotisations")
      .select("user_id")
      .in("user_id", clientIds)
      .eq("status", "active");

    clientsActifs = new Set((cotisActives ?? []).map((c) => c.user_id)).size;

    // 5. Taux de complétion (toutes cotisations)
    const { data: toutesLesCotis } = await admin
      .from("cotisations")
      .select("status")
      .in("user_id", clientIds);

    const terminees = (toutesLesCotis ?? []).filter((c) => c.status === "completed").length;
    const totalCotis = (toutesLesCotis ?? []).length;
    tauxCompletion = totalCotis > 0 ? Math.round((terminees / totalCotis) * 100) : 0;

    // 6. 7-day chart — per-day queries
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    chartData = await Promise.all(
      last7Days.map(async (date) => {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const { data: dayPayments } = await admin
          .from("payments")
          .select("amount")
          .in("user_id", clientIds)
          .eq("status", "success")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        return {
          jour: date.toLocaleDateString("fr-FR", { weekday: "short" }),
          montant: (dayPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0),
        };
      })
    );

    // 7. Top 3 clients this month
    const clientStats = await Promise.all(
      (clients ?? []).map(async (client) => {
        const { data: payments } = await admin
          .from("payments")
          .select("amount")
          .eq("user_id", client.id)
          .eq("status", "success")
          .gte("created_at", startOfMonthISO);

        const total = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
        return {
          name: client.full_name ?? "—",
          totalMois: total,
          nbVersements: payments?.length ?? 0,
        };
      })
    );

    top3 = clientStats
      .filter((c) => c.totalMois > 0)
      .sort((a, b) => b.totalMois - a.totalMois)
      .slice(0, 3);
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
