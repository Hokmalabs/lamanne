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

  // Clients (role=user)
  const { data: clients } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("assigned_commercial", user.id)
    .eq("role", "user");

  const clientIds = (clients ?? []).map((c) => c.id);

  // Active cotisations count
  let activeCotisations = 0;
  let totalCollected = 0;
  let completedCotisations = 0;
  let dailyData: { date: string; total: number }[] = [];
  let topClients: { name: string; total: number }[] = [];

  if (clientIds.length > 0) {
    const { data: cots } = await admin
      .from("cotisations")
      .select("id, status, user_id")
      .in("user_id", clientIds);

    activeCotisations = (cots ?? []).filter((c) => c.status === "active").length;
    completedCotisations = (cots ?? []).filter((c) => c.status === "completed").length;

    const cotIds = (cots ?? []).map((c) => c.id);
    const cotUserMap = Object.fromEntries((cots ?? []).map((c) => [c.id, c.user_id]));

    if (cotIds.length > 0) {
      // Last 7 days payments
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: payments } = await admin
        .from("payments")
        .select("amount, paid_at, cotisation_id")
        .in("cotisation_id", cotIds)
        .gte("paid_at", sevenDaysAgo.toISOString())
        .order("paid_at", { ascending: true });

      totalCollected = (payments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

      // Group by day
      const dayMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        dayMap[key] = 0;
      }
      (payments ?? []).forEach((p) => {
        const d = new Date(p.paid_at);
        const key = d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        if (key in dayMap) dayMap[key] = (dayMap[key] ?? 0) + p.amount;
      });
      dailyData = Object.entries(dayMap).map(([date, total]) => ({ date, total }));

      // Top clients by total payment
      const clientTotals: Record<string, number> = {};
      (payments ?? []).forEach((p) => {
        const userId = cotUserMap[p.cotisation_id];
        if (userId) clientTotals[userId] = (clientTotals[userId] ?? 0) + p.amount;
      });
      topClients = Object.entries(clientTotals)
        .map(([uid, total]) => ({
          name: (clients ?? []).find((c) => c.id === uid)?.full_name ?? "—",
          total,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);
    }
  }

  const totalCotisations = activeCotisations + completedCotisations;
  const completionRate = totalCotisations > 0 ? Math.round((completedCotisations / totalCotisations) * 100) : 0;

  const stats = [
    { label: "Clients assignés", value: clientIds.length, icon: Users, bg: "#0D3B8C" },
    { label: "Collecté (7j)", value: formatCFA(totalCollected), icon: Wallet, bg: "#2D9B6F" },
    { label: "Cotisations actives", value: activeCotisations, icon: TrendingUp, bg: "#378ADD" },
    { label: "Taux complétion", value: `${completionRate}%`, icon: Target, bg: "#F5A623" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mes statistiques</h1>
        <p className="text-gray-400 text-sm mt-0.5">7 derniers jours</p>
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

      <CommercialStatsCharts dailyData={dailyData} topClients={topClients} completionRate={completionRate} />
    </div>
  );
}
