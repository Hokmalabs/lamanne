"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCFA } from "@/lib/utils";
import { MIN_VERSEMENT_CASH, newIdempotencyKey } from "@/lib/versement";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CheckCircle, ChevronDown } from "lucide-react";

interface Client { id: string; full_name: string; phone?: string }
interface Cotisation { id: string; product_name: string; amount_paid: number; total_price: number }

type VersementResult = {
  ok: true;
  idempotent: boolean;
  completed: boolean;
  amount: number;
  amount_paid: number;
  amount_remaining: number;
};

type SuccessState = VersementResult & { clientName?: string; productName: string };

export default function VersementForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [selectedCotisationId, setSelectedCotisationId] = useState("");
  const [amount, setAmount] = useState<number | "">(MIN_VERSEMENT_CASH);
  // Une clé = un versement. Après une coupure réseau, renvoyer la même saisie réutilise
  // la clé : le serveur répond « déjà enregistré », jamais de doublon.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => newIdempotencyKey());
  const [reloadToken, setReloadToken] = useState(0);
  const [cotLoading, setCotLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Sélectionne une cotisation et pré-remplit le montant initial (min(MIN, reste))
  const selectCotisation = (id: string, list: Cotisation[]) => {
    setSelectedCotisationId(id);
    const cot = list.find((c) => c.id === id);
    if (cot) {
      setAmount(Math.min(MIN_VERSEMENT_CASH, Math.max(0, cot.total_price - cot.amount_paid)));
    }
  };

  useEffect(() => {
    if (!selectedClientId) { setCotisations([]); setSelectedCotisationId(""); return; }

    setCotLoading(true);
    supabase
      .from("cotisations")
      .select("id, amount_paid, total_price, status, products(name)")
      .eq("user_id", selectedClientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const mapped: Cotisation[] = (data ?? []).map((c: any) => {
          const product = Array.isArray(c.products) ? c.products[0] : c.products;
          return {
            id: c.id,
            product_name: product?.name ?? "—",
            amount_paid: c.amount_paid,
            total_price: c.total_price ?? 0,
          };
        });
        setCotisations(mapped);
        selectCotisation(mapped[0]?.id ?? "", mapped);
        setCotLoading(false);
      });
  }, [selectedClientId, reloadToken]);

  const selectedCot = cotisations.find((c) => c.id === selectedCotisationId);
  const maxAmount = selectedCot ? Math.max(0, selectedCot.total_price - selectedCot.amount_paid) : 0;
  // Minimum effectif : un reste inférieur au minimum peut être soldé en une fois
  const minAmount = Math.min(MIN_VERSEMENT_CASH, maxAmount);
  const amountNum = typeof amount === "number" ? amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (!selectedCot) { setError("Sélectionnez une cotisation."); return; }
    if (amountNum < minAmount) {
      setError(`Minimum ${formatCFA(minAmount)}.`);
      return;
    }
    if (amountNum > maxAmount) { setError(`Maximum ${formatCFA(maxAmount)}.`); return; }

    setSaving(true);
    try {
      const res = await apiPost<VersementResult>("/api/commercial/versement", {
        cotisation_id: selectedCot.id,
        amount: amountNum,
        idempotency_key: idempotencyKey,
      });
      setSuccess({
        ...res,
        clientName: clients.find((c) => c.id === selectedClientId)?.full_name,
        productName: selectedCot.product_name,
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur réseau. Réessayez.");
      // Conflit (clé déjà utilisée, cotisation changée) : nouveau versement logique
      if (err instanceof ApiClientError && err.status === 409) {
        setIdempotencyKey(newIdempotencyKey());
        setReloadToken((t) => t + 1);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    setSuccess(null);
    setIdempotencyKey(newIdempotencyKey());
    setReloadToken((t) => t + 1);
    router.refresh();
  };

  if (success) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-gray-400 mb-3">Montrez cet écran au client</p>
        <div className="w-14 h-14 bg-lamanne-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="h-7 w-7 text-lamanne-success" />
        </div>
        <p className="font-sora text-3xl font-black text-lamanne-primary">
          {formatCFA(success.amount)} reçus
        </p>
        {success.clientName && (
          <p className="font-semibold text-gray-900 mt-3">{success.clientName}</p>
        )}
        <p className="text-sm text-gray-500">{success.productName}</p>

        <p className="text-sm text-gray-600 mt-4">
          Total payé : <span className="font-semibold">{formatCFA(success.amount_paid)}</span>
          {" / "}{formatCFA(success.amount_paid + success.amount_remaining)}
        </p>

        {success.completed ? (
          <div className="mt-3 rounded-xl bg-lamanne-success/10 text-lamanne-success text-sm font-semibold px-3 py-2">
            Cotisation soldée : l&apos;article peut être retiré.
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-1">
            Reste : <span className="font-bold text-lamanne-primary">{formatCFA(success.amount_remaining)}</span>
          </p>
        )}

        {success.idempotent && (
          <p className="text-xs text-gray-400 mt-3">
            Ce versement était déjà enregistré (aucun doublon).
          </p>
        )}

        <Button type="button" className="w-full h-12 font-bold mt-5" onClick={handleDone}>
          Terminé
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3">{error}</div>
      )}

      <div className="space-y-1.5">
        <Label>Client</Label>
        <div className="relative">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            required
            className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
            style={{ fontSize: "16px" }}
          >
            <option value="">Sélectionner un client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` — ${c.phone}` : ""}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {selectedClientId && (
        <div className="space-y-1.5">
          <Label>Cotisation</Label>
          {cotLoading ? (
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ) : cotisations.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Aucune cotisation active.</p>
          ) : (
            <div className="relative">
              <select
                value={selectedCotisationId}
                onChange={(e) => selectCotisation(e.target.value, cotisations)}
                required
                className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
                style={{ fontSize: "16px" }}
              >
                {cotisations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.product_name} — {formatCFA(c.amount_paid)} / {formatCFA(c.total_price)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {selectedCot && (
        <>
          <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Déjà payé</span>
              <span className="font-semibold text-lamanne-success">{formatCFA(selectedCot.amount_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reste à payer</span>
              <span className="font-bold text-lamanne-primary">{formatCFA(maxAmount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-lamanne-primary h-1.5 rounded-full"
                style={{
                  width: `${selectedCot.total_price > 0 ? Math.min(100, (selectedCot.amount_paid / selectedCot.total_price) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enc-amount">Montant (FCFA)</Label>
            <Input
              id="enc-amount"
              type="number"
              min={minAmount}
              max={maxAmount}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
              style={{ fontSize: "16px" }}
            />
            {maxAmount < MIN_VERSEMENT_CASH && (
              <p className="text-xs text-gray-500">Solde final : {formatCFA(maxAmount)}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-12 font-bold" disabled={saving || amountNum < minAmount}>
            {saving
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
              : <span className="flex items-center gap-2"><Wallet className="h-5 w-5" />Enregistrer</span>}
          </Button>
        </>
      )}
    </form>
  );
}
