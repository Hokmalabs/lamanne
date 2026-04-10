"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CheckCircle, ChevronDown } from "lucide-react";

interface Client { id: string; full_name: string; phone?: string }
interface Cotisation { id: string; product_name: string; amount_paid: number; price: number }

export default function VersementForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [cotisations, setCotisations] = useState<Cotisation[]>([]);
  const [selectedCotisationId, setSelectedCotisationId] = useState("");
  const [amount, setAmount] = useState<number | "">(1000);
  const [cotLoading, setCotLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedClientId) { setCotisations([]); setSelectedCotisationId(""); return; }

    setCotLoading(true);
    supabase
      .from("cotisations")
      .select("id, amount_paid, status, products(name, price)")
      .eq("user_id", selectedClientId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const mapped = (data ?? []).map((c: any) => ({
          id: c.id,
          product_name: Array.isArray(c.products) ? c.products[0]?.name : c.products?.name ?? "—",
          amount_paid: c.amount_paid,
          price: Array.isArray(c.products) ? c.products[0]?.price : c.products?.price ?? 0,
        }));
        setCotisations(mapped);
        setSelectedCotisationId(mapped[0]?.id ?? "");
        setCotLoading(false);
      });
  }, [selectedClientId]);

  const selectedCot = cotisations.find((c) => c.id === selectedCotisationId);
  const maxAmount = selectedCot ? selectedCot.price - selectedCot.amount_paid : 0;
  const amountNum = typeof amount === "number" ? amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!selectedCotisationId) { setError("Sélectionnez une cotisation."); return; }
    if (amountNum < 1000) { setError("Minimum 1 000 FCFA."); return; }
    if (amountNum > maxAmount) { setError(`Maximum ${formatCFA(maxAmount)}.`); return; }

    setSaving(true);
    const res = await fetch("/api/commercial/versement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotisation_id: selectedCotisationId, amount: amountNum }),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur.");
      return;
    }

    const clientName = clients.find((c) => c.id === selectedClientId)?.full_name ?? "client";
    setSuccess(`${formatCFA(amountNum)} enregistré pour ${clientName}.`);
    setAmount(1000);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{success}
        </div>
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
                onChange={(e) => setSelectedCotisationId(e.target.value)}
                required
                className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
                style={{ fontSize: "16px" }}
              >
                {cotisations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.product_name} — {formatCFA(c.amount_paid)} / {formatCFA(c.price)}
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
              <span className="font-semibold text-green-600">{formatCFA(selectedCot.amount_paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reste à payer</span>
              <span className="font-bold text-lamanne-primary">{formatCFA(maxAmount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-lamanne-primary h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (selectedCot.amount_paid / selectedCot.price) * 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enc-amount">Montant (FCFA)</Label>
            <Input
              id="enc-amount"
              type="number"
              min={1000}
              max={maxAmount}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              required
              style={{ fontSize: "16px" }}
            />
          </div>

          <Button type="submit" className="w-full h-12 font-bold" disabled={saving || amountNum < 1000}>
            {saving
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
              : <span className="flex items-center gap-2"><Wallet className="h-5 w-5" />Enregistrer</span>}
          </Button>
        </>
      )}
    </form>
  );
}
