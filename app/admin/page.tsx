"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCFA, formatDate } from "@/lib/utils";
import { ClipboardList, PackageCheck, RefreshCw, TrendingUp, ShoppingBag } from "lucide-react";
import Link from "next/link";

interface Stats {
  totalActive: number;
  totalCollected: number;
  pendingWithdrawals: number;
  pendingRefunds: number;
}

interface RecentCotisation {
  id: string;
  total_price: number;
  amount_paid: number;
  status: string;
  created_at: string;
  product: { name: string };
  profile: { full_name: string };
}

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
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalActive: 0,
    totalCollected: 0,
    pendingWithdrawals: 0,
    pendingRefunds: 0,
  });
  const [recent, setRecent] = useState<RecentCotisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [
        { data: active },
        { data: collected },
        { data: withdrawals },
        { data: refunds },
        { data: recentData },
      ] = await Promise.all([
        supabase.from("cotisations").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("cotisations").select("amount_paid"),
        supabase.from("cotisations")
          .select("id", { count: "exact" })
          .eq("status", "completed")
          .is("withdrawn_at", null),
        supabase.from("cotisations")
          .select("id", { count: "exact" })
          .eq("refund_status", "requested"),
        supabase.from("cotisations")
          .select("id, total_price, amount_paid, status, created_at, product:products(name), profile:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const totalCollected = (collected ?? []).reduce(
        (s: number, c: { amount_paid: number }) => s + (c.amount_paid ?? 0),
        0
      );

      setStats({
        totalActive: active?.length ?? 0,
        totalCollected,
        pendingWithdrawals: withdrawals?.length ?? 0,
        pendingRefunds: refunds?.length ?? 0,
      });

      if (recentData) setRecent(recentData as unknown as RecentCotisation[]);
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statusColors: Record<string, string> = {
    active:    "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const statusLabels: Record<string, string> = {
    active: "En cours", completed: "Terminé", cancelled: "Annulé",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Vue générale</h1>
        <p className="text-gray-500 text-sm mt-0.5">Tableau de bord administrateur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Cotisations actives"
          value={stats.totalActive}
          color="bg-lamanne-primary"
          href="/admin/cotisations"
        />
        <StatCard
          icon={TrendingUp}
          label="Total collecté"
          value={formatCFA(stats.totalCollected)}
          color="bg-lamanne-success"
        />
        <StatCard
          icon={PackageCheck}
          label="Retraits en attente"
          value={stats.pendingWithdrawals}
          color="bg-lamanne-accent"
          href="/admin/retraits"
        />
        <StatCard
          icon={RefreshCw}
          label="Remboursements en attente"
          value={stats.pendingRefunds}
          color="bg-lamanne-warning"
          href="/admin/remboursements"
        />
      </div>

      {/* Dernières cotisations */}
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
                  {c.profile?.full_name ?? "—"}
                </p>
                <p className="text-xs text-gray-400 truncate">{c.product?.name ?? "—"}</p>
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
