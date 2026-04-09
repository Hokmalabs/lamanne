"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/progress-bar";
import { formatCFA, calculateProgress } from "@/lib/utils";
import { Cotisation } from "@/lib/types";
import { ShoppingBag, CreditCard } from "lucide-react";

interface CotisationCardProps {
  cotisation: Cotisation & {
    product: {
      name: string;
      images: string[];
    };
  };
  onPay?: (cotisationId: string) => void;
}

const statusLabels: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  active: { label: "En cours", variant: "warning" },
  completed: { label: "Complété", variant: "success" },
  cancelled: { label: "Annulé", variant: "danger" },
};

export function CotisationCard({ cotisation, onPay }: CotisationCardProps) {
  const progress = calculateProgress(cotisation.amount_paid, cotisation.total_price);
  const status = statusLabels[cotisation.status] || statusLabels.active;
  const imageUrl = cotisation.product.images[0] || null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image produit */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-lamanne-light flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={cotisation.product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-lamanne-accent" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {cotisation.product.name}
            </h3>
            <Badge variant={status.variant} className="flex-shrink-0 text-xs">
              {status.label}
            </Badge>
          </div>

          {/* Progression */}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progression</span>
              <span className="font-semibold text-gray-700">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>

          {/* Montants */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-lamanne-light rounded-lg p-2">
              <p className="text-xs text-gray-500">Payé</p>
              <p className="text-sm font-bold text-lamanne-primary">
                {formatCFA(cotisation.amount_paid)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="text-xs text-gray-500">Restant</p>
              <p className="text-sm font-bold text-red-600">
                {formatCFA(cotisation.amount_remaining)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {cotisation.status === "active" && onPay && (
        <div className="px-4 pb-4">
          <Button
            onClick={() => onPay(cotisation.id)}
            className="w-full"
            size="sm"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Payer une tranche ({formatCFA(cotisation.tranche_amount)})
          </Button>
        </div>
      )}

      {cotisation.status === "completed" && cotisation.withdrawal_code && (
        <div className="px-4 pb-4">
          <div className="bg-lamanne-success/10 rounded-xl p-3 text-center">
            <p className="text-xs text-lamanne-success font-medium mb-1">Code de retrait</p>
            <p className="text-xl font-bold text-lamanne-success tracking-widest">
              {cotisation.withdrawal_code}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
