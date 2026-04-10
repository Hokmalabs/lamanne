"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, X, CheckCircle } from "lucide-react";
import { formatCFA } from "@/lib/utils";

export default function RemboursementModal({
  cotisationId,
  clientId,
  productName,
  amountPaid,
}: {
  cotisationId: string;
  clientId: string;
  productName: string;
  amountPaid: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!motif.trim()) { setError("Veuillez indiquer le motif."); return; }

    setLoading(true);
    const res = await fetch("/api/commercial/remboursement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotisation_id: cotisationId, client_id: clientId, motif: motif.trim() }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setMotif("");
      router.refresh();
    }, 1600);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
        disabled={amountPaid <= 0}
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Remboursement
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
                <p className="font-bold text-gray-900">Demande enregistrée !</p>
                <p className="text-sm text-gray-500 mt-1">Remboursement de {formatCFA(amountPaid)} en attente</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-gray-900">Demande de remboursement</h2>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="mb-4 bg-red-50 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-gray-900">{productName}</p>
                  <p className="text-gray-600 mt-0.5">
                    Montant versé : <span className="font-bold text-red-600">{formatCFA(amountPaid)}</span>
                  </p>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-motif">Motif du remboursement</Label>
                    <textarea
                      id="r-motif"
                      rows={3}
                      placeholder="Ex : Client ne souhaite plus continuer la cotisation…"
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={loading || !motif.trim()}
                    >
                      {loading
                        ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
                        : "Demander"}
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
