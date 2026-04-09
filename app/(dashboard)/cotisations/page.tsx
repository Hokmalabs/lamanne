"use client";

import { CotisationCard } from "@/components/cotisation-card";
import { Button } from "@/components/ui/button";
import { Cotisation } from "@/lib/types";
import { Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";

const mockCotisations: (Cotisation & { product: { name: string; images: string[] } })[] = [
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
    withdrawn_at: null,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    product: { name: "Écouteurs Sony WH-1000XM5", images: [] },
  },
];

export default function CotisationsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Mes cotisations</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {mockCotisations.length} cotisation(s)
          </p>
        </div>
        <Link href="/catalogue">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouvelle
          </Button>
        </Link>
      </div>

      {/* Liste */}
      {mockCotisations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-lamanne-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="h-7 w-7 text-lamanne-accent" />
          </div>
          <h3 className="font-bold text-gray-700 mb-1">Aucune cotisation</h3>
          <p className="text-gray-400 text-sm mb-5">
            Commencez à cotiser pour vos articles préférés.
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
          {mockCotisations.map((cotisation) => (
            <CotisationCard
              key={cotisation.id}
              cotisation={cotisation}
              onPay={(id) => console.log("Payer pour:", id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
