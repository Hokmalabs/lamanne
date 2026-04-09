"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import { formatCFA, formatDate, calculateProgress } from "@/lib/utils";
import { Cotisation } from "@/lib/types";
import { ShoppingBag, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

type CotisationWithProduct = Cotisation & {
  product: { name: string; images: string[] };
};

const mockCotisationsActives: CotisationWithProduct[] = [
  {
    id: "1",
    user_id: "user-1",
    product_id: "prod-1",
    total_price: 250000,
    amount_paid: 175000,
    amount_remaining: 75000,
    nb_tranches: 10,
    tranche_amount: 25000,
    status: "active",
    withdrawal_code: null,
    withdrawn_at: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    product: { name: "Samsung Galaxy A54 5G — 128 Go", images: [] },
  },
  {
    id: "2",
    user_id: "user-1",
    product_id: "prod-2",
    total_price: 450000,
    amount_paid: 90000,
    amount_remaining: 360000,
    nb_tranches: 15,
    tranche_amount: 30000,
    status: "active",
    withdrawal_code: null,
    withdrawn_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    product: { name: "Télévision LG OLED 55\" 4K Smart TV", images: [] },
  },
];

const mockCotisationsTerminees: CotisationWithProduct[] = [
  {
    id: "3",
    user_id: "user-1",
    product_id: "prod-3",
    total_price: 185000,
    amount_paid: 185000,
    amount_remaining: 0,
    nb_tranches: 6,
    tranche_amount: 30833,
    status: "completed",
    withdrawal_code: "LAM8X4K2",
    withdrawn_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    product: { name: "Écouteurs Sony WH-1000XM5 Bluetooth", images: [] },
  },
  {
    id: "4",
    user_id: "user-1",
    product_id: "prod-4",
    total_price: 320000,
    amount_paid: 320000,
    amount_remaining: 0,
    nb_tranches: 8,
    tranche_amount: 40000,
    status: "completed",
    withdrawal_code: "LAM2P9W7",
    withdrawn_at: null,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    product: { name: "Machine à laver Hisense 7 kg", images: [] },
  },
];

const statusConfig = {
  active: { label: "En cours", variant: "warning" as const },
  completed: { label: "Terminé", variant: "success" as const },
  cancelled: { label: "Annulé", variant: "danger" as const },
};

function CotisationRow({ cotisation }: { cotisation: CotisationWithProduct }) {
  const progress = calculateProgress(cotisation.amount_paid, cotisation.total_price);
  const status = statusConfig[cotisation.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="h-5 w-5 text-lamanne-accent" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-snug">
              {cotisation.product.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Démarrée le {formatDate(cotisation.created_at)}
            </p>
          </div>
        </div>
        <Badge variant={status.variant} className="flex-shrink-0">
          {status.label}
        </Badge>
      </div>

      <ProgressBar value={progress} showLabel />

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-xl py-2 px-3">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-sm font-bold text-gray-700">{formatCFA(cotisation.total_price)}</p>
        </div>
        <div className="bg-lamanne-light rounded-xl py-2 px-3">
          <p className="text-xs text-gray-400">Payé</p>
          <p className="text-sm font-bold text-lamanne-primary">{formatCFA(cotisation.amount_paid)}</p>
        </div>
        <div className="bg-red-50 rounded-xl py-2 px-3">
          <p className="text-xs text-gray-400">Restant</p>
          <p className="text-sm font-bold text-red-600">{formatCFA(cotisation.amount_remaining)}</p>
        </div>
      </div>

      {cotisation.status === "completed" && cotisation.withdrawal_code && (
        <div className="bg-lamanne-success/10 rounded-xl p-3 flex items-center gap-3">
          <QrCode className="h-5 w-5 text-lamanne-success flex-shrink-0" />
          <div>
            <p className="text-xs text-lamanne-success font-medium">Code de retrait</p>
            <p className="text-lg font-black text-lamanne-success tracking-widest">
              {cotisation.withdrawal_code}
            </p>
          </div>
          {!cotisation.withdrawn_at && (
            <span className="ml-auto text-xs bg-lamanne-success text-white px-2 py-1 rounded-full font-medium">
              À retirer
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoriquePage() {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const data = activeTab === "active" ? mockCotisationsActives : mockCotisationsTerminees;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Historique</h1>
        <p className="text-gray-500 text-sm mt-0.5">Toutes vos cotisations</p>
      </div>

      {/* Onglets */}
      <div className="flex bg-lamanne-light rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
            activeTab === "active"
              ? "bg-lamanne-primary text-white shadow-sm"
              : "text-lamanne-primary hover:bg-white/50"
          )}
        >
          En cours ({mockCotisationsActives.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={cn(
            "flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all",
            activeTab === "completed"
              ? "bg-lamanne-primary text-white shadow-sm"
              : "text-lamanne-primary hover:bg-white/50"
          )}
        >
          Terminé ({mockCotisationsTerminees.length})
        </button>
      </div>

      {/* Liste */}
      {data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <ShoppingBag className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune cotisation ici</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((cotisation) => (
            <CotisationRow key={cotisation.id} cotisation={cotisation} />
          ))}
        </div>
      )}
    </div>
  );
}
