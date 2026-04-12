"use client";

import { useEffect, useState } from "react";
import { formatCFA, formatDate } from "@/lib/utils";
import { Cotisation, Product } from "@/lib/types";
import {
  Wallet,
  TrendingUp,
  Clock,
  Plus,
  ShoppingBag,
  CheckCircle,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type CotisationWithProduct = Cotisation & {
  product: Pick<Product, "name" | "images" | "is_lot" | "max_tranches">;
};

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function daysUntil(date: Date): number {
  return Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  bg,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  bg: string;
  iconBg: string;
}) {
  return (
    <div
      className="flex-shrink-0 w-44 rounded-2xl p-4 space-y-2 animate-fade-in"
      style={{ background: bg }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
        <Icon className="h-4.5 w-4.5 text-white h-5 w-5" />
      </div>
      <div>
        <p className="text-white/70 text-xs font-medium">{label}</p>
        <p className="text-white font-black text-lg leading-tight truncate">{value}</p>
        <p className="text-white/50 text-[11px]">{sub}</p>
      </div>
    </div>
  );
}

export default function DashboardContent({ showGreeting = true }: { showGreeting?: boolean }) {
  const [cotisations, setCotisations] = useState<CotisationWithProduct[]>([]);
  const [prenom, setPrenom] = useState("Utilisateur");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setPrenom(profile.full_name.split(" ")[0]);

      const { data: cotisData } = await supabase
        .from("cotisations")
        .select("*, product:products(name, images, is_lot, max_tranches)")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false });

      if (cotisData) setCotisations(cotisData as CotisationWithProduct[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const active = cotisations.filter((c) => c.status === "active");
  const completed = cotisations.filter((c) => c.status === "completed");
  const totalEngaged = cotisations.reduce((s, c) => s + c.total_price, 0);
  const totalPaid = cotisations.reduce((s, c) => s + c.amount_paid, 0);
  const totalRemaining = cotisations.reduce((s, c) => s + c.amount_remaining, 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {showGreeting && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Bonjour, {prenom} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Voici votre résumé</p>
          </div>
          {/* FAB on mobile, button on desktop */}
          <Link
            href="/catalogue"
            className="w-11 h-11 rounded-2xl bg-[#0D3B8C] text-white flex items-center justify-center shadow-lg hover:bg-[#0D3B8C]/90 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      )}

      {/* Metric cards — horizontal scroll on mobile */}
      <div className="-mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 animate-stagger">
          <MetricCard
            icon={Wallet}
            label="Total engagé"
            value={formatCFA(totalEngaged)}
            sub={`${cotisations.length} cotisation(s)`}
            bg="#0D3B8C"
            iconBg="rgba(255,255,255,0.2)"
          />
          <MetricCard
            icon={TrendingUp}
            label="Total payé"
            value={formatCFA(totalPaid)}
            sub="Versements effectués"
            bg="#2D9B6F"
            iconBg="rgba(255,255,255,0.2)"
          />
          <MetricCard
            icon={Clock}
            label="Restant à payer"
            value={formatCFA(totalRemaining)}
            sub="Sur toutes cotisations"
            bg="#F5A623"
            iconBg="rgba(255,255,255,0.2)"
          />
        </div>
      </div>

      {/* Prêt à retirer */}
      {!loading && completed.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#2D9B6F] mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Prêt à retirer ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((c) => (
              <div
                key={c.id}
                className="bg-[#2D9B6F]/8 border border-[#2D9B6F]/20 rounded-2xl p-4 flex items-center gap-4 animate-fade-in"
                style={{ background: "rgba(45,155,111,0.06)" }}
              >
                <div className="w-12 h-12 bg-[#2D9B6F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-6 w-6 text-[#2D9B6F]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Code :{" "}
                    <span className="font-black text-[#2D9B6F] tracking-widest">
                      {c.withdrawal_code}
                    </span>
                  </p>
                </div>
                <Link href="/cotisations">
                  <button className="text-xs bg-[#2D9B6F] text-white px-3 py-1.5 rounded-xl font-semibold flex-shrink-0">
                    Voir
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cotisations actives */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Cotisations actives</h2>
          <Link
            href="/cotisations"
            className="text-sm text-[#378ADD] hover:underline font-medium"
          >
            Voir tout
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div
            className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center"
          >
            <div className="w-14 h-14 bg-[#E8F1FB] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-7 w-7 text-[#378ADD]" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">Aucune cotisation en cours</h3>
            <p className="text-gray-400 text-sm mb-5">Commencez à cotiser depuis le catalogue.</p>
            <Link href="/catalogue">
              <button className="bg-[#0D3B8C] text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Explorer le catalogue
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3 animate-stagger">
            {active.slice(0, 3).map((cotisation) => {
              const deadline = addMonths(cotisation.created_at, cotisation.product.max_tranches);
              const days = daysUntil(deadline);
              const progress = Math.round((cotisation.amount_paid / cotisation.total_price) * 100);
              const progressColor =
                progress >= 70 ? "#2D9B6F" : progress >= 30 ? "#F5A623" : "#E53E3E";
              return (
                <Link key={cotisation.id} href={`/cotisations/${cotisation.id}`}>
                  <div className="bg-white rounded-2xl p-4 animate-fade-in card-hover" style={{ boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="h-5 w-5 text-[#378ADD]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
                            {cotisation.product.name}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            Limite : {formatDate(deadline.toISOString())}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {days <= 30 && days >= 0 && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {days === 0 ? "Expire auj." : `${days}j`}
                          </span>
                        )}
                        {days < 0 && (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                            Expiré
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full progress-bar-fill"
                          style={{ width: `${Math.min(100, progress)}%`, background: progressColor }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-9 text-right">{progress}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{formatCFA(cotisation.amount_paid)} payés</span>
                      <span>{formatCFA(cotisation.amount_remaining)} restants</span>
                    </div>
                  </div>
                </Link>
              );
            })}
            {active.length > 3 && (
              <Link href="/cotisations">
                <button className="w-full border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-600 hover:border-gray-400 transition-colors">
                  Voir toutes les cotisations ({active.length})
                </button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Accès rapide */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Accès rapide</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/catalogue">
            <div className="bg-[#0D3B8C] rounded-2xl p-5 text-white hover:opacity-90 transition-opacity cursor-pointer active:scale-95">
              <ShoppingBag className="h-6 w-6 mb-3 opacity-80" />
              <p className="font-bold text-sm">Explorer</p>
              <p className="text-white/50 text-xs">Le catalogue</p>
            </div>
          </Link>
          <Link href="/historique">
            <div className="bg-[#378ADD] rounded-2xl p-5 text-white hover:opacity-90 transition-opacity cursor-pointer active:scale-95">
              <Clock className="h-6 w-6 mb-3 opacity-80" />
              <p className="font-bold text-sm">Historique</p>
              <p className="text-white/50 text-xs">Mes paiements</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
