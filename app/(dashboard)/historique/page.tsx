"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Cotisation, Product } from "@/lib/types";
import { formatCFA, formatDate, calculateProgress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import { cn } from "@/lib/utils";
import { ShoppingBag, QrCode, Package, Clock } from "lucide-react";

type CotisationWithProduct = Cotisation & {
  product: Pick<Product, "name" | "images" | "is_lot">;
};

type Tab = "active" | "completed" | "cancelled";

const refundLabels: Record<string, { label: string; color: string }> = {
  none:      { label: "—",           color: "text-gray-400" },
  requested: { label: "En attente",  color: "text-yellow-600" },
  approved:  { label: "Approuvé",    color: "text-green-600" },
  rejected:  { label: "Rejeté",      color: "text-red-600" },
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
      <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">{label}</p>
    </div>
  );
}

function CotisationRow({ cotisation }: { cotisation: CotisationWithProduct }) {
  const progress = calculateProgress(cotisation.amount_paid, cotisation.total_price);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
            {cotisation.product.is_lot
              ? <Package className="h-5 w-5 text-lamanne-accent" />
              : <ShoppingBag className="h-5 w-5 text-lamanne-accent" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-snug">
              {cotisation.product.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {cotisation.product.is_lot && (
                <span className="text-xs bg-lamanne-accent/10 text-lamanne-accent font-semibold px-2 py-0.5 rounded-full">
                  LOT
                </span>
              )}
              <span className="text-xs text-gray-400">
                {formatDate(cotisation.created_at)}
              </span>
            </div>
          </div>
        </div>

        {cotisation.status === "active" && <Badge variant="warning">En cours</Badge>}
        {cotisation.status === "completed" && <Badge variant="success">Terminé</Badge>}
        {cotisation.status === "cancelled" && <Badge variant="danger">Annulé</Badge>}
      </div>

      {/* Progression */}
      <ProgressBar value={progress} showLabel />

      {/* Montants */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl py-2 px-1">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-xs font-bold text-gray-700">{formatCFA(cotisation.total_price)}</p>
        </div>
        <div className="bg-lamanne-light rounded-xl py-2 px-1">
          <p className="text-xs text-gray-400">Payé</p>
          <p className="text-xs font-bold text-lamanne-primary">{formatCFA(cotisation.amount_paid)}</p>
        </div>
        <div className={cn("rounded-xl py-2 px-1", cotisation.status === "cancelled" ? "bg-orange-50" : "bg-red-50")}>
          <p className="text-xs text-gray-400">Restant</p>
          <p className={cn("text-xs font-bold", cotisation.status === "cancelled" ? "text-orange-600" : "text-red-600")}>
            {formatCFA(cotisation.amount_remaining)}
          </p>
        </div>
      </div>

      {/* Code de retrait (completed) */}
      {cotisation.status === "completed" && cotisation.withdrawal_code && (
        <div className="bg-lamanne-success/10 rounded-xl p-3 flex items-center gap-3">
          <QrCode className="h-5 w-5 text-lamanne-success flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-lamanne-success font-medium">Code de retrait</p>
            <p className="text-xl font-black text-lamanne-success tracking-widest">
              {cotisation.withdrawal_code}
            </p>
          </div>
          {cotisation.withdrawn_at ? (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">
              Retiré
            </span>
          ) : (
            <span className="text-xs bg-lamanne-success text-white px-2 py-1 rounded-full font-medium">
              À retirer
            </span>
          )}
        </div>
      )}

      {/* Infos annulation (cancelled) */}
      {cotisation.status === "cancelled" && (
        <div className="bg-orange-50 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Annulée le</span>
            <span className="font-semibold text-gray-800">
              {cotisation.cancelled_at ? formatDate(cotisation.cancelled_at) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Montant remboursable</span>
            <span className="font-semibold text-orange-700">
              {formatCFA(cotisation.refund_amount ?? 0)}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Statut remboursement</span>
            <span className={cn("font-semibold", refundLabels[cotisation.refund_status ?? "none"]?.color)}>
              {refundLabels[cotisation.refund_status ?? "none"]?.label}
            </span>
          </div>
          {cotisation.cancellation_reason && (
            <div className="pt-1 border-t border-orange-100">
              <p className="text-xs text-gray-500">
                Motif : {cotisation.cancellation_reason}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoriquePage() {
  const [tab, setTab] = useState<Tab>("active");
  const [data, setData] = useState<Record<Tab, CotisationWithProduct[]>>({
    active: [],
    completed: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rows } = await supabase
        .from("cotisations")
        .select("*, product:products(name, images, is_lot)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rows) {
        setData({
          active:    rows.filter((r) => r.status === "active") as CotisationWithProduct[],
          completed: rows.filter((r) => r.status === "completed") as CotisationWithProduct[],
          cancelled: rows.filter((r) => r.status === "cancelled") as CotisationWithProduct[],
        });
      }
      setLoading(false);
    }
    fetchAll();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "active",    label: `En cours (${data.active.length})` },
    { key: "completed", label: `Terminées (${data.completed.length})` },
    { key: "cancelled", label: `Annulées (${data.cancelled.length})` },
  ];

  const current = data[tab];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Historique</h1>
        <p className="text-gray-500 text-sm mt-0.5">Toutes vos cotisations</p>
      </div>

      {/* Onglets */}
      <div className="flex bg-lamanne-light rounded-xl p-1 gap-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
              tab === key
                ? "bg-lamanne-primary text-white shadow-sm"
                : "text-lamanne-primary hover:bg-white/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-40 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {/* Contenu */}
      {!loading && current.length === 0 && (
        <EmptyState
          label={
            tab === "active"
              ? "Aucune cotisation en cours"
              : tab === "completed"
              ? "Aucune cotisation terminée"
              : "Aucune cotisation annulée"
          }
        />
      )}

      {!loading && current.length > 0 && (
        <div className="space-y-4">
          {current.map((c) => (
            <CotisationRow key={c.id} cotisation={c} />
          ))}
        </div>
      )}

      {/* Légende remboursements */}
      {!loading && tab === "cancelled" && data.cancelled.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Statuts des remboursements
          </p>
          <p><span className="text-yellow-600 font-semibold">En attente</span> — Votre demande est en cours de traitement</p>
          <p><span className="text-green-600 font-semibold">Approuvé</span> — Le remboursement a été validé</p>
          <p><span className="text-red-600 font-semibold">Rejeté</span> — La demande a été refusée</p>
        </div>
      )}
    </div>
  );
}
