"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, X, CheckCircle } from "lucide-react";
import { formatCFA } from "@/lib/utils";

export default function VersementModal({
  cotisationId,
  productName,
  maxAmount,
}: {
  cotisationId: string;
  productName: string;
  maxAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | "">(Math.min(1000, maxAmount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const amountNum = typeof amount === "number" ? amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (amountNum < 1000) { setError("Minimum 1 000 FCFA."); return; }
    if (amountNum > maxAmount) { setError(`Maximum ${formatCFA(maxAmount)}.`); return; }

    setLoading(true);
    const res = await fetch("/api/commercial/versement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotisation_id: cotisationId, amount: amountNum }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setOpen(false); setSuccess(false);
      setAmount(Math.min(1000, maxAmount));
      router.refresh();
    }, 1400);
  };

  return (
    <>
      <Button size="sm" className="flex-1" onClick={() => setOpen(true)} disabled={maxAmount <= 0}>
        <Wallet className="h-4 w-4 mr-1.5" />
        Versement
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            {success ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">Versement enregistré !</p>
                <p className="text-sm text-gray-500 mt-1">{formatCFA(amountNum)} pour {productName}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-gray-900">Enregistrer un versement</h2>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  <span className="font-semibold text-gray-900">{productName}</span>
                  {" — "}reste <strong className="text-lamanne-primary">{formatCFA(maxAmount)}</strong>
                </p>

                {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="v-amount">Montant (FCFA)</Label>
                    <Input id="v-amount" type="number" min={1000} max={maxAmount} step={100}
                      value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      required style={{ fontSize: "16px" }} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Annuler</Button>
                    <Button type="submit" className="flex-1" disabled={loading || amountNum < 1000}>
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
