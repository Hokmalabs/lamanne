"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Package, UserCircle, CheckCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  max_tranches: number;
}

interface Client {
  id: string;
  full_name: string;
  phone?: string;
}

function NouvelleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [firstPayment, setFirstPayment] = useState<number | "">(1000);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load commercial's clients and products
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [clientsRes, productsRes] = await Promise.all([
        fetch("/api/commercial/clients"),
        supabase.from("products").select("id, name, price, image_url, max_tranches").eq("available", true).order("name"),
      ]);

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.clients ?? []);
        if (preselectedClientId) {
          const found = (data.clients ?? []).find((c: Client) => c.id === preselectedClientId);
          if (found) setSelectedClient(found);
        }
      }

      setProducts((productsRes.data ?? []) as Product[]);
      setLoading(false);
    }
    load();
  }, [preselectedClientId]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const firstPaymentNum = typeof firstPayment === "number" ? firstPayment : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedProduct) {
      setError("Veuillez sélectionner un client et un produit.");
      return;
    }
    if (firstPaymentNum < 1000) {
      setError("Le premier versement doit être d'au moins 1 000 FCFA.");
      return;
    }
    if (firstPaymentNum > selectedProduct.price) {
      setError("Le versement ne peut pas dépasser le prix total.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/commercial/nouvelle-cotisation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: selectedClient.id,
        product_id: selectedProduct.id,
        first_payment: firstPaymentNum,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de la création.");
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
          La cotisation de <strong>{selectedClient?.full_name}</strong> pour{" "}
          <strong>{selectedProduct?.name}</strong> a été démarrée avec un premier versement de{" "}
          <strong>{formatCFA(firstPaymentNum)}</strong>.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => {
            setSuccess(false);
            setSelectedClient(null);
            setSelectedProduct(null);
            setFirstPayment(1000);
            setProductSearch("");
          }}>
            Nouvelle cotisation
          </Button>
          <Button className="flex-1" onClick={() => router.push("/commercial/clients")}>
            Voir les clients
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Step 1: Client */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-lamanne-primary" />
          1. Sélectionner le client
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedClient(c)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                selectedClient?.id === c.id
                  ? "border-lamanne-primary bg-lamanne-primary/5"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-lamanne-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lamanne-primary font-bold text-xs">
                  {c.full_name?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</p>
                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
              </div>
            </button>
          ))}
          {clients.length === 0 && (
            <p className="col-span-2 text-center text-gray-400 text-sm py-4">Aucun client assigné</p>
          )}
        </div>
      </div>

      {/* Step 2: Product */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-lamanne-primary" />
          2. Choisir le produit
        </h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
          {filteredProducts.map((p) => (
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
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <Package className="h-5 w-5 text-gray-400" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                <p className="text-xs text-lamanne-primary font-bold">{formatCFA(p.price)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: First payment */}
      {selectedProduct && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-bold text-gray-900 mb-4">3. Premier versement</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstPayment">Montant du premier versement (FCFA)</Label>
              <Input
                id="firstPayment"
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
                <span className="text-gray-500">Reste à payer</span>
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
        disabled={saving || !selectedClient || !selectedProduct}
      >
        {saving
          ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
          : "Démarrer la cotisation"}
      </Button>
    </form>
  );
}

export default function NouvelleCoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Nouvelle cotisation</h1>
        <p className="text-gray-500 text-sm mt-1">Démarrez une cotisation pour un client.</p>
      </div>
      <Suspense fallback={<div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />}>
        <NouvelleForm />
      </Suspense>
    </div>
  );
}
