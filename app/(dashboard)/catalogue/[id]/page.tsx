"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product, Cotisation } from "@/lib/types";
import { formatCFA, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  ChevronLeft,
  Package,
  Check,
  AlertTriangle,
  Calendar,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

function addMonths(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [existingCotisation, setExistingCotisation] = useState<Cotisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [months, setMonths] = useState<number>(1);
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [{ data: prod }, { data: { user } }] = await Promise.all([
        supabase.from("products").select("*, category:categories(name)").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);

      if (!prod) { setLoading(false); return; }
      setProduct(prod as Product);
      setMonths((prod as Product).max_tranches);

      if (user) {
        const { data: cot } = await supabase
          .from("cotisations")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", id)
          .eq("status", "active")
          .maybeSingle();
        if (cot) setExistingCotisation(cot as Cotisation);
      }

      setLoading(false);
    }
    fetchData();
  }, [id]);

  const deadline = product ? addMonths(months) : null;

  const handleStartCotisation = async () => {
    if (!product) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/client/nouvelle-cotisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          months,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Erreur lors de la création");
        setSaving(false);
        return;
      }
      router.push(`/cotisations/${data.cotisation_id}`);
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
      setSaving(false);
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
        <Link href="/catalogue">
          <Button className="mt-4" variant="outline">Retour au catalogue</Button>
        </Link>
      </div>
    );
  }

  const minMonths = product.min_tranches ?? 1;
  const maxMonths = product.max_tranches;
  const monthlyAmount = Math.ceil(product.price / months);
  const monthOptions = Array.from(
    { length: Math.max(0, maxMonths - minMonths + 1) },
    (_, i) => minMonths + i,
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>
        <button
          onClick={() => {
            const url = `${window.location.origin}/catalogue-public/${product.id}`;
            const text = `🛍️ "${product.name}" sur LAMANNE — Cotisez à votre rythme !\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#25D366] bg-[#25D366]/10 px-3 py-1.5 rounded-xl hover:bg-[#25D366]/20 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Partager
        </button>
      </div>

      {/* Image + infos produit */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative h-52 bg-lamanne-light flex items-center justify-center">
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
          {product.category?.name && (
            <p className="text-xs text-lamanne-accent font-semibold uppercase tracking-wide mb-1">
              {product.category.name}
            </p>
          )}
          <h1 className="font-sora text-xl font-black text-gray-900 leading-snug">{product.name}</h1>
          <p className="font-sora text-2xl font-black text-lamanne-primary mt-2">{formatCFA(product.price)}</p>
          {product.description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-xs text-lamanne-warning font-semibold mt-2">
              Plus que {product.stock} en stock
            </p>
          )}
        </div>
      </div>

      {/* Contenu du lot */}
      {product.is_lot && product.lot_details && (
        <div className="bg-white rounded-2xl border border-lamanne-accent/20 shadow-sm p-5">
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
      <div className="bg-lamanne-light border border-lamanne-primary/20 rounded-2xl p-4 flex gap-3">
        <Calendar className="h-5 w-5 text-lamanne-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-lamanne-primary">
            {minMonths === maxMonths
              ? `Durée : ${maxMonths} mois`
              : `Durée au choix : de ${minMonths} à ${maxMonths} mois`}
          </p>
          {deadline && (
            <p className="text-lamanne-primary mt-0.5">
              Date limite : {formatDate(deadline.toISOString())}
            </p>
          )}
          {(product as any).delivery_days && (
            <p className="text-lamanne-primary mt-1">
              Livraison estimée : {(product as any).delivery_days} jour{(product as any).delivery_days > 1 ? "s" : ""} après la fin de cotisation
            </p>
          )}
        </div>
      </div>

      {/* Cotisation existante */}
      {existingCotisation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">Cotisation en cours</p>
            <p className="text-yellow-700 mt-0.5">
              Vous avez déjà une cotisation active pour ce produit.{" "}
              <Link href="/cotisations" className="underline font-semibold">
                Voir mes cotisations
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Configurateur */}
      {!existingCotisation && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <h2 className="font-sora font-bold text-gray-900">Démarrer ma cotisation</h2>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Durée */}
          <div className="space-y-2">
            {minMonths === maxMonths ? (
              <p className="text-sm font-semibold text-gray-700">Durée : {maxMonths} mois</p>
            ) : (
              <>
                <label htmlFor="months" className="text-sm font-semibold text-gray-700 block">
                  Durée de la cotisation
                </label>
                <select
                  id="months"
                  value={months}
                  onChange={(e) => {
                    setMonths(Number(e.target.value));
                    setConfirming(false);
                  }}
                  disabled={saving}
                  className="w-full h-12 border border-gray-200 rounded-xl px-4 font-semibold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
                  style={{ fontSize: "16px" }}
                >
                  {monthOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} mois
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Résumé */}
          <div className="bg-lamanne-light rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Prix total</span>
              <span className="font-semibold text-gray-800">{formatCFA(product.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Durée</span>
              <span className="font-semibold text-gray-800">{months} mois</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Environ</span>
              <span className="font-black text-lamanne-primary text-base">
                {formatCFA(monthlyAmount)} par mois
              </span>
            </div>
            {deadline && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date limite</span>
                <span className="font-semibold text-gray-800">{formatDate(deadline.toISOString())}</span>
              </div>
            )}
            <div className="border-t border-lamanne-accent/20 pt-2 mt-2">
              <p className="text-xs text-gray-500 text-center">
                Aucun paiement aujourd&apos;hui : vous versez auprès de votre agent LAMANNE.
              </p>
            </div>
          </div>

          {!confirming ? (
            <Button
              className="w-full h-12 text-base font-bold"
              onClick={() => setConfirming(true)}
              disabled={saving || product.stock === 0}
            >
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Continuer
              </span>
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">Article</span>
                  <span className="font-semibold text-gray-800 text-right">{product.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prix total</span>
                  <span className="font-semibold text-gray-800">{formatCFA(product.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Durée</span>
                  <span className="font-semibold text-gray-800">{months} mois</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant approximatif par mois</span>
                  <span className="font-semibold text-lamanne-primary">{formatCFA(monthlyAmount)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1 h-12 font-bold"
                  onClick={handleStartCotisation}
                  disabled={saving || product.stock === 0}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Création...
                    </span>
                  ) : (
                    "Confirmer la cotisation"
                  )}
                </Button>
              </div>
            </div>
          )}

          {product.stock === 0 && (
            <p className="text-center text-sm text-red-500 font-medium">
              Ce produit est en rupture de stock.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
