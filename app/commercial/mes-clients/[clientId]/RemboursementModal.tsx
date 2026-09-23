"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateCcw, X, CheckCircle } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import { apiPost, ApiClientError } from "@/lib/api-client";

export default function RemboursementModal({
  cotisationId,
  productName,
  amountPaid,
}: {
  cotisationId: string;
  productName: string;
  amountPaid: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!motif.trim()) { setError("Veuillez indiquer le motif."); return; }

    setLoading(true);
    try {
      const result = await apiPost<{ ok: true; refund_amount: number }>(
        "/api/commercial/remboursement",
        { cotisation_id: cotisationId, motif: motif.trim() },
      );

      // Montant affiché = celui réellement enregistré par le serveur
      setRefundAmount(result.refund_amount);
      setSuccess(true);
      closeTimer.current = setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setRefundAmount(null);
        setMotif("");
        router.refresh();
      }, 1600);
    } catch (e) {
      // L'erreur reste affichée : le modal ne se ferme pas
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="flex-1 text-lamanne-danger border-lamanne-danger/30 hover:bg-lamanne-danger/10 hover:text-lamanne-danger"
        onClick={() => setOpen(true)}
        disabled={amountPaid <= 0}
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Remboursement
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={() => !loading && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[calc(100vh-3rem)] overflow-y-auto my-auto">
            {success ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-lamanne-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-lamanne-success" />
                </div>
                <p className="font-bold text-gray-900">Demande enregistrée.</p>
                {refundAmount !== null && (
                  <p className="text-sm text-gray-500 mt-1">
                    Montant prévu : {formatCFA(refundAmount)}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-sora font-black text-gray-900">Demande de remboursement</h2>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>

                <div className="mb-4 bg-lamanne-danger/5 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-gray-900">{productName}</p>
                  <p className="text-gray-600 mt-0.5">
                    Montant versé : <span className="font-bold text-lamanne-danger">{formatCFA(amountPaid)}</span>
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-3 py-2"
                  >
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
                      variant="destructive"
                      className="flex-1"
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
