"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-6 max-w-3xl mx-auto">
      {showGreeting && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Bonjour, {prenom} 👋</h1>
            <p className="text-gray-500 text-sm mt-0.5">Voici un résumé de vos cotisations</p>
          </div>
          <Link href="/catalogue">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle
            </Button>
          </Link>
        </div>
      )}

      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total engagé" value={formatCFA(totalEngaged)}
          subtitle={`${cotisations.length} cotisation(s)`} icon={Wallet} variant="primary" />
        <MetricCard title="Total payé" value={formatCFA(totalPaid)}
          subtitle="Versements effectués" icon={TrendingUp} variant="success" />
        <MetricCard title="Restant à payer" value={formatCFA(totalRemaining)}
          subtitle="Sur toutes les cotisations" icon={Clock} variant="warning" />
      </div>

      {/* Prêt à retirer */}
      {!loading && completed.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-lamanne-success mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Prêt à retirer ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map((c) => (
              <div key={c.id} className="bg-white border border-lamanne-success/30 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-lamanne-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-lamanne-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Code : <span className="font-black text-lamanne-success tracking-widest">{c.withdrawal_code}</span>
                  </p>
                </div>
                <Link href="/cotisations">
                  <Button size="sm" variant="outline" className="flex-shrink-0 text-xs">Voir</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cotisations actives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Mes cotisations actives</h2>
          <Link href="/cotisations" className="text-sm text-lamanne-accent hover:underline font-medium">Voir tout</Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="w-14 h-14 bg-lamanne-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-7 w-7 text-lamanne-accent" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">Aucune cotisation en cours</h3>
            <p className="text-gray-400 text-sm mb-5">Commencez à cotiser depuis le catalogue.</p>
            <Link href="/catalogue"><Button><Plus className="h-4 w-4 mr-2" />Explorer le catalogue</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {active.slice(0, 3).map((cotisation) => {
              const deadline = addMonths(cotisation.created_at, cotisation.product.max_tranches);
              const days = daysUntil(deadline);
              return (
                <Link key={cotisation.id} href={`/cotisations/${cotisation.id}`}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="font-semibold text-gray-900 text-sm leading-snug">{cotisation.product.name}</p>
                      {days <= 30 && days >= 0 && (
                        <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          {days === 0 ? "Expire aujourd'hui" : `${days}j restants`}
                        </span>
                      )}
                      {days < 0 && (
                        <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Expiré</span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{formatCFA(cotisation.amount_paid)} payés</span>
                      <span className="font-semibold text-gray-700">{Math.round((cotisation.amount_paid / cotisation.total_price) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-lamanne-primary rounded-full" style={{ width: `${Math.min(100, Math.round((cotisation.amount_paid / cotisation.total_price) * 100))}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Limite : {formatDate(deadline.toISOString())}
                    </p>
                  </div>
                </Link>
              );
            })}
            {active.length > 3 && (
              <Link href="/cotisations">
                <Button variant="outline" className="w-full">Voir toutes les cotisations ({active.length})</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Accès rapide */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/catalogue">
            <div className="bg-lamanne-primary rounded-2xl p-5 text-white hover:opacity-90 transition-opacity cursor-pointer">
              <ShoppingBag className="h-7 w-7 mb-3" />
              <p className="font-bold text-sm">Explorer</p>
              <p className="text-white/60 text-xs">Le catalogue produits</p>
            </div>
          </Link>
          <Link href="/historique">
            <div className="bg-lamanne-accent rounded-2xl p-5 text-white hover:opacity-90 transition-opacity cursor-pointer">
              <Clock className="h-7 w-7 mb-3" />
              <p className="font-bold text-sm">Historique</p>
              <p className="text-white/60 text-xs">Mes paiements</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
