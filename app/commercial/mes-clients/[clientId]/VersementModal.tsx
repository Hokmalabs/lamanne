"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, X, CheckCircle } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import { MIN_VERSEMENT_CASH, newIdempotencyKey } from "@/lib/versement";
import { apiPost, ApiClientError } from "@/lib/api-client";

type VersementResult = {
  ok: true;
  idempotent: boolean;
  completed: boolean;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
};

export default function VersementModal({
  cotisationId,
  productName,
  clientName,
  maxAmount,
}: {
  cotisationId: string;
  productName: string;
  clientName?: string;
  maxAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Minimum effectif : un reste inférieur au minimum peut être soldé en une fois
  const minAmount = Math.min(MIN_VERSEMENT_CASH, maxAmount);
  const [amount, setAmount] = useState<number | "">(minAmount);
  // Une clé = un versement. Après une coupure réseau, renvoyer la même saisie réutilise
  // la clé : le serveur répond « déjà enregistré », jamais de doublon.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VersementResult | null>(null);

  const amountNum = typeof amount === "number" ? amount : 0;

  const handleOpen = () => {
    if (amount === "") setAmount(minAmount);
    setError(null);
    setResult(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (amountNum < minAmount) {
      setError(`Minimum ${formatCFA(minAmount)}.`);
      return;
    }
    if (amountNum > maxAmount) { setError(`Maximum ${formatCFA(maxAmount)}.`); return; }

    setLoading(true);
    try {
      const res = await apiPost<VersementResult>("/api/commercial/versement", {
        cotisation_id: cotisationId,
        amount: amountNum,
        idempotency_key: idempotencyKey,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur réseau. Réessayez.");
      // Conflit (clé déjà utilisée, cotisation changée) : nouveau versement logique
      if (err instanceof ApiClientError && err.status === 409) {
        setIdempotencyKey(newIdempotencyKey());
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    setOpen(false);
    setResult(null);
    setAmount(""); // montant par défaut recalculé à la prochaine ouverture (reste à jour)
    setIdempotencyKey(newIdempotencyKey());
    router.refresh();
  };

  return (
    <>
      <Button size="sm" className="flex-1" onClick={handleOpen} disabled={maxAmount <= 0}>
        <Wallet className="h-4 w-4 mr-1.5" />
        Versement
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !loading && !result && setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[calc(100vh-3rem)] overflow-y-auto my-auto">
            {result ? (
              <div className="text-center py-2">
                <p className="text-xs text-gray-400 mb-3">Montrez cet écran au client</p>
                <div className="w-14 h-14 bg-lamanne-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-lamanne-success" />
                </div>
                <p className="font-sora text-3xl font-black text-lamanne-primary">
                  {formatCFA(result.amount)} reçus
                </p>
                {clientName && (
                  <p className="font-semibold text-gray-900 mt-3">{clientName}</p>
                )}
                <p className="text-sm text-gray-500">{productName}</p>

                <p className="text-sm text-gray-600 mt-4">
                  Total payé : <span className="font-semibold">{formatCFA(result.amount_paid)}</span>
                  {" / "}{formatCFA(result.amount_paid + result.amount_remaining)}
                </p>

                {result.completed ? (
                  <div className="mt-3 rounded-xl bg-lamanne-success/10 text-lamanne-success text-sm font-semibold px-3 py-2">
                    Cotisation soldée : l&apos;article peut être retiré.
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">
                    Reste : <span className="font-bold text-lamanne-primary">{formatCFA(result.amount_remaining)}</span>
                  </p>
                )}

                {result.idempotent && (
                  <p className="text-xs text-gray-400 mt-3">
                    Ce versement était déjà enregistré (aucun doublon).
                  </p>
                )}

                <Button type="button" className="w-full mt-5" onClick={handleDone}>
                  Terminé
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-sora font-black text-gray-900">Enregistrer un versement</h2>
                  <button onClick={() => !loading && setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-semibold text-gray-900">{productName}</span>
                  {" — "}reste <strong className="text-lamanne-primary">{formatCFA(maxAmount)}</strong>
                </p>

                {error && (
                  <div className="mb-4 rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-3 py-2">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-amount">Montant (FCFA)</Label>
                    <Input id="v-amount" type="number" min={minAmount} max={maxAmount} step={100}
                      value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      required style={{ fontSize: "16px" }} />
                    {maxAmount < MIN_VERSEMENT_CASH && (
                      <p className="text-xs text-gray-500">Solde final : {formatCFA(maxAmount)}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading || amountNum < minAmount}>
                      {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span> : "Confirmer"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
