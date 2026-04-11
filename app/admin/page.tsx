import { createClient } from "@supabase/supabase-js";
import { ClipboardList, PackageCheck, RefreshCw, TrendingUp, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatCFA, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 ${href ? "hover:shadow-md transition-shadow" : ""}`}>
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

const statusColors: Record<string, string> = {
  active:    "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabels: Record<string, string> = {
  active: "En cours", completed: "Terminé", cancelled: "Annulé",
};

export default async function AdminOverviewPage() {
  const [
    { data: active },
    { data: collected },
    { data: withdrawals },
    { data: refunds },
    { data: recentRaw },
  ] = await Promise.all([
    admin.from("cotisations").select("id").eq("status", "active"),
    admin.from("cotisations").select("amount_paid"),
    admin.from("cotisations").select("id").eq("status", "completed").is("withdrawn_at", null),
    admin.from("cotisations").select("id").eq("refund_status", "requested"),
    admin.from("cotisations").select("id, total_price, amount_paid, status, created_at, user_id, product_id")
      .order("created_at", { ascending: false }).limit(8),
  ]);

  const totalCollected = (collected ?? []).reduce((s, c) => s + (c.amount_paid ?? 0), 0);

  // Enrich recent cotisations with profile + product (separate queries — avoids JOIN issues)
  const recent = await Promise.all(
    (recentRaw ?? []).map(async (c) => {
      const [{ data: profile }, { data: product }] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", c.user_id).single(),
        admin.from("products").select("name").eq("id", c.product_id).single(),
      ]);
      return { ...c, profile, product };
    })
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Vue générale</h1>
        <p className="text-gray-500 text-sm mt-0.5">Tableau de bord administrateur</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Cotisations actives" value={active?.length ?? 0}
          color="bg-lamanne-primary" href="/admin/cotisations" />
        <StatCard icon={TrendingUp} label="Total collecté" value={formatCFA(totalCollected)}
          color="bg-lamanne-success" />
        <StatCard icon={PackageCheck} label="Retraits en attente" value={withdrawals?.length ?? 0}
          color="bg-lamanne-accent" href="/admin/retraits" />
        <StatCard icon={RefreshCw} label="Remboursements en attente" value={refunds?.length ?? 0}
          color="bg-lamanne-warning" href="/admin/remboursements" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Dernières cotisations</h2>
          <Link href="/admin/cotisations" className="text-sm text-lamanne-accent hover:underline font-medium">
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
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {(c.profile as any)?.full_name ?? "—"}
                </p>
                <p className="text-xs text-gray-400 truncate">{(c.product as any)?.name ?? "—"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-800">{formatCFA(c.amount_paid)}</p>
                <p className="text-xs text-gray-400">{formatDate(c.created_at)}</p>
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
