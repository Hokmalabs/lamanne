"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Cotisation, Product } from "@/lib/types";
import { formatCFA, formatDate, calculateProgress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import { cn } from "@/lib/utils";
import { ShoppingBag, QrCode, Package, Clock, Banknote } from "lucide-react";

type CotisationWithProduct = Cotisation & {
  product: Pick<Product, "name" | "images" | "is_lot">;
};

type Payment = {
  id: string;
  amount: number;
  paid_at: string;
  cotisation_id: string;
  productName: string;
};

type Tab = "active" | "completed" | "cancelled" | "payments";

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

      <ProgressBar value={progress} showLabel />

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
  const [cotisations, setCotisations] = useState<{
    active: CotisationWithProduct[];
    completed: CotisationWithProduct[];
    cancelled: CotisationWithProduct[];
  }>({ active: [], completed: [], cancelled: [] });
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: rows }, { data: paymentRows }] = await Promise.all([
        supabase
          .from("cotisations")
          .select("*, product:products(name, images, is_lot)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, amount, paid_at, cotisation_id, cotisations(product_id, products(name))")
          .order("paid_at", { ascending: false }),
      ]);

      if (rows) {
        setCotisations({
          active:    rows.filter((r) => r.status === "active") as CotisationWithProduct[],
          completed: rows.filter((r) => r.status === "completed") as CotisationWithProduct[],
          cancelled: rows.filter((r) => r.status === "cancelled") as CotisationWithProduct[],
        });
      }

      if (paymentRows) {
        setPayments(
          paymentRows.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            paid_at: p.paid_at,
            cotisation_id: p.cotisation_id,
            productName: p.cotisations?.products?.name ?? "—",
          }))
        );
      }

      setLoading(false);
    }
    fetchAll();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: "active",    label: `En cours (${cotisations.active.length})` },
    { key: "completed", label: `Terminées (${cotisations.completed.length})` },
    { key: "cancelled", label: `Annulées (${cotisations.cancelled.length})` },
    { key: "payments",  label: `Paiements (${payments.length})` },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Historique</h1>
        <p className="text-gray-500 text-sm mt-0.5">Toutes vos cotisations</p>
      </div>

      {/* Onglets */}
      <div className="grid grid-cols-4 bg-lamanne-light rounded-xl p-1 gap-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "py-2 px-1 rounded-lg text-xs font-semibold transition-all",
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

      {/* Cotisation tabs */}
      {!loading && tab !== "payments" && (
        <>
          {cotisations[tab].length === 0 && (
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
          {cotisations[tab].length > 0 && (
            <div className="space-y-4">
              {cotisations[tab].map((c) => (
                <CotisationRow key={c.id} cotisation={c} />
              ))}
            </div>
          )}
          {tab === "cancelled" && cotisations.cancelled.length > 0 && (
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
        </>
      )}

      {/* Payments tab */}
      {!loading && tab === "payments" && (
        <>
          {payments.length === 0 ? (
            <EmptyState label="Aucun paiement enregistré" />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {payments.map((p) => (
                <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Banknote className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.productName}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.paid_at)}</p>
                  </div>
                  <p className="text-sm font-bold text-green-600 flex-shrink-0">
                    +{formatCFA(p.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
