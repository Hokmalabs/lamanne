import { ClipboardList, PackageCheck, RefreshCw, TrendingUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requirePageAuth } from "@/lib/api-security";
import ProgressRing from "@/components/ProgressRing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Profile = { id: string; full_name: string | null };

// PostgREST renvoie un objet ou un tableau selon la relation — même normalisation
// que app/api/admin/remboursements/[id]/route.ts
function pickOne<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

const statusColors: Record<string, string> = {
  active:    "bg-lamanne-soft text-lamanne-primary",
  completed: "bg-lamanne-success/10 text-lamanne-success",
  cancelled: "bg-lamanne-danger/10 text-lamanne-danger",
};
const statusLabels: Record<string, string> = {
  active: "En cours", completed: "Terminé", cancelled: "Annulé",
};

function StatCard({
  icon: Icon,
  label,
  value,
  bgClass,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  bgClass: string;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl p-4 space-y-2 animate-fade-in ${bgClass}`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="font-sora text-2xl font-black text-white truncate">{value}</p>
        <p className="text-xs text-white/60 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block hover:opacity-90 transition-opacity">{inner}</Link> : inner;
}

export default async function AdminOverviewPage() {
  await requirePageAuth(["admin", "super_admin"]);
  const [
    { data: active },
    { data: collected },
    { data: withdrawals },
    { data: refunds },
    { data: recentRaw },
  ] = await Promise.all([
    supabaseAdmin.from("cotisations").select("id, amount_paid, total_price").eq("status", "active"),
    supabaseAdmin.from("cotisations").select("amount_paid"),
    supabaseAdmin.from("cotisations").select("id").eq("status", "completed").is("withdrawn_at", null),
    supabaseAdmin.from("cotisations").select("id").eq("refund_status", "requested"),
    supabaseAdmin.from("cotisations").select("id, total_price, amount_paid, status, created_at, user_id, products(name)")
      .order("created_at", { ascending: false }).limit(8),
  ]);

  const totalCollected = (collected ?? []).reduce((s, c) => s + (c.amount_paid ?? 0), 0);

  // Taux de complétion moyen des cotisations actives (0 si aucun montant attendu)
  const activeRows = active ?? [];
  const activeExpected = activeRows.reduce((s, c) => s + (c.total_price ?? 0), 0);
  const activePaid = activeRows.reduce((s, c) => s + (c.amount_paid ?? 0), 0);
  const avgCompletion =
    activeExpected > 0
      ? Math.min(100, Math.max(0, Math.round((activePaid / activeExpected) * 100)))
      : 0;

  // cotisations.user_id référence auth.users (pas profiles) : aucun embed PostgREST
  // possible vers profiles. Une seule requête groupée remplace le N+1.
  const userIds = Array.from(new Set((recentRaw ?? []).map((c) => c.user_id as string)));
  const profilesById = new Map<string, Profile>();

  if (userIds.length > 0) {
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    for (const p of (profilesData ?? []) as Profile[]) {
      profilesById.set(p.id, p);
    }
  }

  const recent = (recentRaw ?? []).map((c) => ({
    ...c,
    profile: profilesById.get(c.user_id as string) ?? null,
    product: pickOne<{ name: string }>(c.products),
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Vue générale</h1>
        <p className="text-gray-400 text-sm mt-0.5">Tableau de bord administrateur</p>
      </div>

      {/* Héros — total collecté + complétion moyenne */}
      <div className="bg-lamanne-primary rounded-2xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-5 animate-fade-in">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Total collecté
          </p>
          <p className="font-sora text-3xl sm:text-4xl font-black mt-1 break-words">
            {formatCFA(totalCollected)}
          </p>
          <p className="text-sm text-white/70 mt-2">
            {activeRows.length} cotisation(s) active(s) en cours
          </p>
        </div>
        <div className="flex-shrink-0 self-center bg-white rounded-2xl p-3">
          <ProgressRing value={avgCompletion} size={104} label="payé" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="Cotisations actives" value={activeRows.length}
          bgClass="bg-lamanne-primary" href="/admin/cotisations" />
        <StatCard icon={TrendingUp} label="Total collecté" value={formatCFA(totalCollected)}
          bgClass="bg-lamanne-success" />
        <StatCard icon={PackageCheck} label="Retraits en attente" value={withdrawals?.length ?? 0}
          bgClass="bg-lamanne-accent" href="/admin/retraits" />
        <StatCard icon={RefreshCw} label="Remboursements" value={refunds?.length ?? 0}
          bgClass="bg-lamanne-warning" href="/admin/remboursements" />
      </div>

      {/* Recent cotisations */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-sora font-bold text-gray-900 truncate">Dernières cotisations</h2>
          <Link href="/admin/cotisations" className="text-sm text-lamanne-accent hover:underline font-medium flex-shrink-0">
            Voir tout
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.length === 0 && (
            <div className="p-8 text-center">
              <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucune cotisation</p>
            </div>
          )}
          {recent.map((c) => (
            <div key={c.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3">
              {/* Avatar initiales */}
              <div className="w-9 h-9 rounded-full bg-lamanne-soft flex items-center justify-center flex-shrink-0">
                <span className="text-lamanne-primary font-bold text-xs">
                  {c.profile?.full_name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {c.profile?.full_name ?? "—"}
                </p>
                <p className="text-xs text-gray-400 truncate">{c.product?.name ?? "—"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-sora text-sm font-bold text-gray-800">{formatCFA(c.amount_paid)}</p>
                <p className="hidden sm:block text-xs text-gray-400">{formatDate(c.created_at)}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[c.status] ?? "bg-gray-100 text-gray-600"}`}>
                {statusLabels[c.status] ?? c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
