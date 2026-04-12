"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, ChevronDown, CheckCircle, Users, X } from "lucide-react";

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

export default function EncaissementsContent({
  cotisations,
}: {
  cotisations: EnrichedCotisation[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, number | "">>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  const toggleForm = (id: string) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (!amounts[id]) setAmounts((prev) => ({ ...prev, [id]: 1000 }));
  };

  const handleSubmit = async (cot: EnrichedCotisation) => {
    const amount = amounts[cot.id];
    const amountNum = typeof amount === "number" ? amount : 0;
    const maxAmount = cot.product_price - cot.amount_paid;

    if (amountNum < 1000) { setErrors((p) => ({ ...p, [cot.id]: "Minimum 1 000 FCFA." })); return; }
    if (amountNum > maxAmount) { setErrors((p) => ({ ...p, [cot.id]: `Maximum ${formatCFA(maxAmount)}.` })); return; }

    setSaving(cot.id);
    setErrors((p) => ({ ...p, [cot.id]: "" }));

    const res = await fetch("/api/commercial/versement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotisation_id: cot.id, amount: amountNum }),
    });

    setSaving(null);

    if (!res.ok) {
      const d = await res.json();
      setErrors((p) => ({ ...p, [cot.id]: d.error ?? "Erreur." }));
      return;
    }

    setSuccesses((p) => ({ ...p, [cot.id]: true }));
    setOpenId(null);
    setTimeout(() => {
      setSuccesses((p) => ({ ...p, [cot.id]: false }));
      router.refresh();
    }, 1800);
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
        const pct = Math.min(100, Math.round((cot.amount_paid / cot.product_price) * 100));
        const remaining = cot.product_price - cot.amount_paid;
        const isOpen = openId === cot.id;
        const isSaving = saving === cot.id;
        const isSuccess = successes[cot.id];
        const err = errors[cot.id];

        return (
          <div key={cot.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="p-4">
              {/* Client + product */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0D3B8C] font-bold text-sm">
                      {cot.client_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{cot.client_name}</p>
                    <p className="text-xs text-gray-400">{cot.product_name}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Reste</p>
                  <p className="font-black text-[#0D3B8C] text-sm">{formatCFA(remaining)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{formatCFA(cot.amount_paid)} payé</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: pct >= 70 ? "#2D9B6F" : pct >= 30 ? "#F5A623" : "#E55353",
                    }}
                  />
                </div>
              </div>

              {/* Success message */}
              {isSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm mb-3 bg-green-50 rounded-xl px-3 py-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Versement enregistré !
                </div>
              )}

              {/* Toggle button */}
              <button
                onClick={() => toggleForm(cot.id)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isOpen
                    ? "bg-gray-100 text-gray-600"
                    : "bg-[#0D3B8C] text-white hover:bg-[#0D3B8C]/90"
                }`}
              >
                {isOpen ? (
                  <><X className="h-4 w-4" />Annuler</>
                ) : (
                  <><Wallet className="h-4 w-4" />Enregistrer un versement</>
                )}
              </button>
            </div>

            {/* Inline form */}
            {isOpen && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
                {err && (
                  <p className="text-red-600 text-xs mb-2 bg-red-50 rounded-lg px-3 py-2">{err}</p>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                      Montant (FCFA) — max {formatCFA(remaining)}
                    </label>
                    <Input
                      type="number"
                      min={1000}
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
