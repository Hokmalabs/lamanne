"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCFA } from "@/lib/utils";
import { MIN_VERSEMENT_CASH, newIdempotencyKey } from "@/lib/versement";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, CheckCircle, Users, X } from "lucide-react";

type EnrichedCotisation = {
  id: string;
  user_id: string;
  amount_paid: number;
  total_price: number;
  product_name: string;
  product_price: number;
  client_name: string;
  client_phone: string | null;
};

type VersementResult = {
  ok: true;
  idempotent: boolean;
  completed: boolean;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
};

export default function EncaissementsContent({
  cotisations,
}: {
  cotisations: EnrichedCotisation[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number | "">>({});
  // Une clé = un versement. Après une coupure réseau, renvoyer la même saisie réutilise
  // la clé : le serveur répond « déjà enregistré », jamais de doublon.
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, VersementResult>>({});

  const toggleForm = (cot: EnrichedCotisation) => {
    const id = cot.id;
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setErrors((p) => ({ ...p, [id]: "" }));
    if (amounts[id] === undefined) {
      const remaining = Math.max(0, cot.total_price - cot.amount_paid);
      setAmounts((p) => ({ ...p, [id]: Math.min(MIN_VERSEMENT_CASH, remaining) }));
    }
    // Clé créée à la première ouverture seulement
    if (!keys[id]) setKeys((p) => ({ ...p, [id]: newIdempotencyKey() }));
  };

  const handleSubmit = async (cot: EnrichedCotisation) => {
    if (saving) return;
    const amount = amounts[cot.id];
    const amountNum = typeof amount === "number" ? amount : 0;
    const maxAmount = Math.max(0, cot.total_price - cot.amount_paid);
    // Minimum effectif : un reste inférieur au minimum peut être soldé en une fois
    const minAmount = Math.min(MIN_VERSEMENT_CASH, maxAmount);

    if (amountNum < minAmount) {
      setErrors((p) => ({ ...p, [cot.id]: `Minimum ${formatCFA(minAmount)}.` }));
      return;
    }
    if (amountNum > maxAmount) {
      setErrors((p) => ({ ...p, [cot.id]: `Maximum ${formatCFA(maxAmount)}.` }));
      return;
    }

    setSaving(cot.id);
    setErrors((p) => ({ ...p, [cot.id]: "" }));

    try {
      const res = await apiPost<VersementResult>("/api/commercial/versement", {
        cotisation_id: cot.id,
        amount: amountNum,
        idempotency_key: keys[cot.id],
      });
      setResults((p) => ({ ...p, [cot.id]: res }));
      setOpenId(null);
    } catch (err) {
      setErrors((p) => ({
        ...p,
        [cot.id]: err instanceof ApiClientError ? err.message : "Erreur réseau. Réessayez.",
      }));
      // Conflit (clé déjà utilisée, cotisation changée) : nouveau versement logique
      if (err instanceof ApiClientError && err.status === 409) {
        setKeys((p) => ({ ...p, [cot.id]: newIdempotencyKey() }));
        router.refresh();
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDone = (id: string) => {
    setResults((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    // Montant par défaut recalculé à la prochaine ouverture (reste à jour)
    setAmounts((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
    setKeys((p) => ({ ...p, [id]: newIdempotencyKey() }));
    router.refresh();
  };

  if (cotisations.length === 0) {
    return (
      <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400" style={{ boxShadow: "var(--shadow-sm)" }}>
        <Users className="h-12 w-12 mb-3 opacity-30" />
        <p className="font-semibold">Aucune cotisation active</p>
        <p className="text-sm mt-1">Vos clients n&apos;ont pas de cotisation en cours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-gray-900">Cotisations actives ({cotisations.length})</h2>
      {cotisations.map((cot) => {
        const pct = cot.total_price > 0
          ? Math.min(100, Math.round((cot.amount_paid / cot.total_price) * 100))
          : 0;
        const remaining = Math.max(0, cot.total_price - cot.amount_paid);
        const isOpen = openId === cot.id;
        const isSaving = saving === cot.id;
        const result = results[cot.id];
        const err = errors[cot.id];

        return (
          <div key={cot.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="p-4">
              {/* Client + product */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lamanne-primary font-bold text-sm">
                      {cot.client_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-sora font-bold text-gray-900 text-sm">{cot.client_name}</p>
                    <p className="text-xs text-gray-400">{cot.product_name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Reste</p>
                  <p className="font-sora font-black text-lamanne-primary text-sm">{formatCFA(remaining)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{formatCFA(cot.amount_paid)} payé</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="progress-bar-fill h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {result ? (
                /* Écran de succès à montrer au client */
                <div className="text-center border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 mb-3">Montrez cet écran au client</p>
                  <div className="w-12 h-12 bg-lamanne-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-lamanne-success" />
                  </div>
                  <p className="font-sora text-3xl font-black text-lamanne-primary">
                    {formatCFA(result.amount)} reçus
                  </p>
                  <p className="font-semibold text-gray-900 mt-3">{cot.client_name}</p>
                  <p className="text-sm text-gray-500">{cot.product_name}</p>

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

                  <Button type="button" className="w-full mt-4 font-bold" onClick={() => handleDone(cot.id)}>
                    Terminé
                  </Button>
                </div>
              ) : (
                /* Toggle button */
                <button
                  onClick={() => toggleForm(cot)}
                  disabled={isSaving || remaining <= 0}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                    isOpen
                      ? "bg-gray-100 text-gray-600"
                      : "bg-lamanne-primary text-white hover:bg-lamanne-primary/90"
                  }`}
                >
                  {isOpen ? (
                    <><X className="h-4 w-4" />Annuler</>
                  ) : (
                    <><Wallet className="h-4 w-4" />Enregistrer un versement</>
                  )}
                </button>
              )}
            </div>

            {/* Inline form */}
            {isOpen && !result && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
                {err && (
                  <p className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-xs mb-2 px-3 py-2">{err}</p>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Montant (FCFA) — max {formatCFA(remaining)}
                    </label>
                    <Input
                      type="number"
                      min={Math.min(MIN_VERSEMENT_CASH, remaining)}
                      max={remaining}
                      step={100}
                      value={amounts[cot.id] ?? ""}
                      onChange={(e) =>
                        setAmounts((p) => ({
                          ...p,
                          [cot.id]: e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      style={{ fontSize: "16px" }}
                    />
                    {remaining < MIN_VERSEMENT_CASH && (
                      <p className="text-xs text-gray-500 mt-1">Solde final : {formatCFA(remaining)}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handleSubmit(cot)}
                    disabled={isSaving}
                    className="h-11 px-5 font-bold flex-shrink-0"
                  >
                    {isSaving ? (
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "OK"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
