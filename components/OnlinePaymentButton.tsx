"use client";

import { useState } from "react";
import { CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCFA } from "@/lib/utils";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { ONLINE_MIN_CREDIT, ONLINE_SERVICE_FEE, onlineCharge } from "@/lib/online-payment";

type InitiateResponse = { ok: true; merchant_ref: string; payment_url: string };

/**
 * Paiement en ligne d'une cotisation (checkout hébergé GeniusPay).
 * Ne crédite rien : crée une intention côté serveur puis redirige vers la page sécurisée.
 */
export default function OnlinePaymentButton({
  cotisationId,
  productName,
  remaining,
}: {
  cotisationId: string;
  productName: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(remaining);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (remaining < ONLINE_MIN_CREDIT) {
    return (
      <p className="text-sm mt-0.5">
        Reste de {formatCFA(remaining)} : à régler en espèces auprès de votre agent.
      </p>
    );
  }

  const amountNum = typeof amount === "number" ? amount : 0;
  const isValid =
    Number.isInteger(amountNum) && amountNum >= ONLINE_MIN_CREDIT && amountNum <= remaining;
  const total = onlineCharge(amountNum);

  const handleOpen = () => {
    setAmount(remaining);
    setError(null);
    setOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
  };

  const handlePay = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<InitiateResponse>("/api/payments/initiate", {
        cotisation_id: cotisationId,
        amount: amountNum,
      });
      // Reste en chargement pendant la redirection (pas de double envoi)
      window.location.assign(res.payment_url);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau. Réessayez.");
      setLoading(false);
    }
  };

  return (
    <>
      <Button type="button" className="w-full mt-3" onClick={handleOpen}>
        <CreditCard className="h-4 w-4 mr-2" />
        Payer en ligne
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-sora text-lg font-black text-gray-900">Payer en ligne</h2>
                <p className="text-sm text-gray-500 truncate">{productName}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`online-amount-${cotisationId}`}>Montant à créditer (FCFA)</Label>
              <Input
                id={`online-amount-${cotisationId}`}
                type="number"
                inputMode="numeric"
                min={ONLINE_MIN_CREDIT}
                max={remaining}
                step={1}
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === "" ? "" : Math.trunc(Number(e.target.value)))
                }
                disabled={loading}
                style={{ fontSize: "16px" }}
              />
              <p className={isValid ? "text-xs text-gray-400" : "text-xs text-lamanne-danger"}>
                Entre {formatCFA(ONLINE_MIN_CREDIT)} et {formatCFA(remaining)}.
              </p>
            </div>

            {/* Récapitulatif toujours visible avant validation */}
            <div className="bg-lamanne-light rounded-xl p-4 text-sm space-y-1.5">
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">Montant crédité</span>
                <span className="font-semibold">{formatCFA(amountNum)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-600">Frais de service</span>
                <span className="font-semibold">{formatCFA(ONLINE_SERVICE_FEE)}</span>
              </div>
              <div className="flex justify-between items-baseline gap-3 border-t border-lamanne-accent/20 pt-2 mt-1">
                <span className="font-bold text-gray-900">Total à payer</span>
                <span className="font-sora text-2xl font-black text-lamanne-primary">
                  {formatCFA(total)}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Wave, Orange Money, MTN ou carte : vous choisirez sur la page sécurisée GeniusPay.
              Le paiement en espèces auprès de votre agent est sans frais.
            </p>

            <Button
              type="button"
              className="w-full h-12 text-base font-bold"
              onClick={handlePay}
              disabled={!isValid || loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirection...
                </span>
              ) : (
                `Payer ${formatCFA(total)}`
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
