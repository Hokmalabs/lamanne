"use client";

import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { CotisationCard } from "@/components/cotisation-card";
import { Button } from "@/components/ui/button";
import { formatCFA } from "@/lib/utils";
import { Cotisation } from "@/lib/types";
import { Wallet, TrendingUp, Clock, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type CotisationWithProduct = Cotisation & {
  product: { name: string; images: string[] };
};

export default function DashboardPage() {
  const [cotisations, setCotisations] = useState<CotisationWithProduct[]>([]);
  const [prenom, setPrenom] = useState("Utilisateur");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) {
        setPrenom(profile.full_name.split(" ")[0]);
      }

      const { data: cotisData } = await supabase
        .from("cotisations")
        .select("*, product:products(name, images)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cotisData) setCotisations(cotisData as CotisationWithProduct[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalEngaged = cotisations.reduce((s, c) => s + c.total_price, 0);
  const totalPaid = cotisations.reduce((s, c) => s + c.amount_paid, 0);
  const totalRemaining = cotisations.reduce((s, c) => s + c.amount_remaining, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Bonjour, {prenom} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Voici un résumé de vos cotisations
          </p>
        </div>
        <Link href="/catalogue">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle
          </Button>
        </Link>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total engagé"
          value={formatCFA(totalEngaged)}
          subtitle={`${cotisations.length} cotisation(s)`}
          icon={Wallet}
          variant="primary"
        />
        <MetricCard
          title="Total payé"
          value={formatCFA(totalPaid)}
          subtitle="Versements effectués"
          icon={TrendingUp}
          variant="success"
        />
        <MetricCard
          title="Restant à payer"
          value={formatCFA(totalRemaining)}
          subtitle="Sur toutes les cotisations"
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Cotisations actives */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Mes cotisations actives
          </h2>
          <Link
            href="/historique"
            className="text-sm text-lamanne-accent hover:underline font-medium"
          >
            Voir tout
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse"
              />
            ))}
          </div>
        ) : cotisations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <div className="w-14 h-14 bg-lamanne-light rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-7 w-7 text-lamanne-accent" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">
              Aucune cotisation en cours
            </h3>
            <p className="text-gray-400 text-sm mb-5">
              Commencez à cotiser pour vos articles préférés depuis le catalogue.
            </p>
            <Link href="/catalogue">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Explorer le catalogue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {cotisations.map((cotisation) => (
              <CotisationCard
                key={cotisation.id}
                cotisation={cotisation}
                onPay={(id) => {
                  console.log("Payer tranche pour cotisation:", id);
                }}
              />
            ))}
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
