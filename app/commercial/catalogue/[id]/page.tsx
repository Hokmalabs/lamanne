"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { formatCFA, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingBag,
  ChevronLeft,
  Package,
  Calendar,
  User,
  Users,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ClientProfile {
  id: string;
  full_name: string;
  phone: string | null;
}

function addMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function CommercialProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<"self" | "client">("client");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [firstPayment, setFirstPayment] = useState<number | "">(1000);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prod }, { data: clientList }] = await Promise.all([
        supabase.from("products").select("*, category:categories(name)").eq("id", id).single(),
        supabase.from("profiles").select("id, full_name, phone").eq("assigned_commercial", user.id).order("full_name"),
      ]);

      if (prod) setProduct(prod as Product);
      if (clientList) setClients(clientList as ClientProfile[]);
      setLoading(false);
    }
    load();
  }, [id]);

  const firstPaymentNum = typeof firstPayment === "number" ? firstPayment : 0;
  const deadline = product ? addMonths(product.max_tranches) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setError(null);

    if (mode === "client") {
      if (!selectedClientId) { setError("Sélectionnez un client."); return; }
      if (firstPaymentNum < 1000) { setError("Minimum 1 000 FCFA."); return; }
      if (firstPaymentNum > product.price) { setError("Le versement dépasse le prix."); return; }

      setSaving(true);
      const res = await fetch("/api/commercial/nouvelle-cotisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          product_id: product.id,
          first_payment: firstPaymentNum,
        }),
      });
      setSaving(false);

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Erreur.");
        return;
      }

      router.push(`/commercial/mes-clients/${selectedClientId}`);
    } else {
      // Redirect to user catalogue for self-cotisation
      router.push(`/catalogue/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl h-64 animate-pulse" />
        <div className="bg-white rounded-2xl h-48 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Produit introuvable</p>
        <Link href="/commercial/catalogue">
          <Button className="mt-4" variant="outline">Retour au catalogue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link
        href="/commercial/catalogue"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      {/* Product card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative h-48 bg-lamanne-light flex items-center justify-center">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="h-16 w-16 text-lamanne-accent/40" />
          )}
          {product.is_lot && (
            <span className="absolute top-3 left-3 bg-lamanne-accent text-white text-xs font-bold px-3 py-1 rounded-full">
              LOT
            </span>
          )}
        </div>
        <div className="p-5">
          <h1 className="text-xl font-black text-gray-900">{product.name}</h1>
          <p className="text-2xl font-black text-lamanne-primary mt-1">{formatCFA(product.price)}</p>
          {product.description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
          )}
        </div>
      </div>

      {/* Lot details */}
      {product.is_lot && product.lot_details && (
        <div className="bg-white rounded-2xl border border-lamanne-accent/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-lamanne-accent" />
            <h2 className="font-bold text-gray-900">Contenu du lot</h2>
          </div>
          <ul className="space-y-1.5">
            {product.lot_details.split("\n").filter((l) => l.trim()).map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lamanne-accent flex-shrink-0" />
                {line.trim()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Délai */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>{product.max_tranches} mois</strong> pour compléter la cotisation
          {deadline && <span className="text-blue-600"> — limite : {formatDate(deadline.toISOString())}</span>}
        </p>
      </div>

      {/* Mode selector + form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <h2 className="font-bold text-gray-900">Démarrer une cotisation</h2>

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode("client")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              mode === "client" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Users className="h-4 w-4" />
            Pour un client
          </button>
          <button
            type="button"
            onClick={() => setMode("self")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              mode === "self" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <User className="h-4 w-4" />
            Pour moi
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {mode === "self" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Vous serez redirigé vers votre espace client pour démarrer votre propre cotisation.
            </p>
            <Button className="w-full h-12 text-base font-bold" onClick={() => router.push(`/catalogue/${id}`)}>
              Continuer vers mon espace
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client selector */}
            <div className="space-y-1.5">
              <Label htmlFor="cc-client">Client</Label>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3">
                  Aucun client assigné.{" "}
                  <Link href="/commercial/mes-clients" className="text-lamanne-accent underline">
                    Ajouter un client
                  </Link>
                </p>
              ) : (
                <div className="relative">
                  <select
                    id="cc-client"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
                    style={{ fontSize: "16px" }}
                  >
                    <option value="">— Sélectionner un client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}{c.phone ? ` (${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* First payment */}
            <div className="space-y-1.5">
              <Label htmlFor="cc-amount">Premier versement (FCFA)</Label>
              <Input
                id="cc-amount"
                type="number"
                min={1000}
                max={product.price}
                step={100}
                value={firstPayment}
                onChange={(e) => setFirstPayment(e.target.value === "" ? "" : Number(e.target.value))}
                required
                style={{ fontSize: "16px" }}
              />
            </div>

            {/* Summary */}
            {firstPaymentNum >= 1000 && (
              <div className="bg-lamanne-light rounded-xl p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Prix total</span>
                  <span className="font-semibold">{formatCFA(product.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Premier versement</span>
                  <span className="font-semibold text-green-600">− {formatCFA(firstPaymentNum)}</span>
                </div>
                <div className="flex justify-between border-t border-lamanne-accent/20 pt-1.5 font-bold">
                  <span>Reste</span>
                  <span className="text-lamanne-primary">{formatCFA(Math.max(0, product.price - firstPaymentNum))}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold"
              disabled={saving || clients.length === 0}
            >
              {saving
                ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                : "Démarrer la cotisation"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
