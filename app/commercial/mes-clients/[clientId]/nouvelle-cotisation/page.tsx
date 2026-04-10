"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  max_tranches: number;
}

export default function NouvelleCoClientPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [clientName, setClientName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [firstPayment, setFirstPayment] = useState<number | "">(1000);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: profile }, { data: prods }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", clientId).single(),
        supabase.from("products").select("id, name, price, max_tranches").eq("available", true).order("name"),
      ]);
      setClientName(profile?.full_name ?? "Client");
      setProducts((prods ?? []) as Product[]);
      setLoading(false);
    }
    load();
  }, [clientId]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const firstPaymentNum = typeof firstPayment === "number" ? firstPayment : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { setError("Sélectionnez un produit."); return; }
    if (firstPaymentNum < 1000) { setError("Minimum 1 000 FCFA."); return; }
    if (firstPaymentNum > selectedProduct.price) { setError("Le versement dépasse le prix."); return; }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/commercial/nouvelle-cotisation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        product_id: selectedProduct.id,
        first_payment: firstPaymentNum,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur.");
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Cotisation créée !</h2>
        <p className="text-gray-500 text-sm mb-6">
          Cotisation pour <strong>{clientName}</strong> sur{" "}
          <strong>{selectedProduct?.name}</strong> démarrée avec{" "}
          <strong>{formatCFA(firstPaymentNum)}</strong>.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => {
            setSuccess(false); setSelectedProduct(null); setFirstPayment(1000); setSearch("");
          }}>
            Autre produit
          </Button>
          <Button className="flex-1" onClick={() => router.push(`/commercial/mes-clients/${clientId}`)}>
            Voir le client
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/commercial/mes-clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au client
      </Link>

      <div>
        <h1 className="text-2xl font-black text-gray-900">Nouvelle cotisation</h1>
        <p className="text-gray-500 text-sm mt-1">Pour <strong>{clientName}</strong></p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Product selection */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="h-5 w-5 text-lamanne-primary" />
              Choisir le produit
            </h2>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProduct(p)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    selectedProduct?.id === p.id
                      ? "border-lamanne-primary bg-lamanne-primary/5"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-lamanne-primary font-bold">{formatCFA(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* First payment */}
          {selectedProduct && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Premier versement</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fp">Montant (FCFA)</Label>
                  <Input
                    id="fp"
                    type="number"
                    min={1000}
                    max={selectedProduct.price}
                    step={100}
                    value={firstPayment}
                    onChange={(e) => setFirstPayment(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prix total</span>
                    <span className="font-semibold">{formatCFA(selectedProduct.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Premier versement</span>
                    <span className="font-semibold text-green-600">− {formatCFA(firstPaymentNum)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1">
                    <span className="text-gray-500">Reste</span>
                    <span className="font-bold text-lamanne-primary">
                      {formatCFA(Math.max(0, selectedProduct.price - firstPaymentNum))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold"
            disabled={saving || !selectedProduct}
          >
            {saving
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
              : "Démarrer la cotisation"}
          </Button>
        </form>
      )}
    </div>
  );
}
