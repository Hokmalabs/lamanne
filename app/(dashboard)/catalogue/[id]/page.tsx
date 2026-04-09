"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product, Cotisation } from "@/lib/types";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  ChevronLeft,
  Package,
  CreditCard,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TRANCHE_OPTIONS = [1, 2, 3, 6, 10, 12];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [existingCotisation, setExistingCotisation] =
    useState<Cotisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nbTranches, setNbTranches] = useState(3);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [{ data: prod }, { data: { user } }] = await Promise.all([
        supabase.from("products").select("*, category:categories(name)").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);

      if (!prod) { setLoading(false); return; }
      setProduct(prod as Product);

      // Clamp nbTranches dans la plage autorisée
      const validOptions = TRANCHE_OPTIONS.filter(
        (n) => n >= prod.min_tranches && n <= prod.max_tranches
      );
      if (validOptions.length > 0) setNbTranches(validOptions[Math.floor(validOptions.length / 2)]);

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

  const validOptions = product
    ? TRANCHE_OPTIONS.filter(
        (n) => n >= product.min_tranches && n <= product.max_tranches
      )
    : [];

  const trancheAmount = product
    ? Math.ceil(product.price / nbTranches)
    : 0;

  const handleStartCotisation = async () => {
    setSaving(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !product) { setSaving(false); return; }

    const total = product.price;
    const tranche = Math.ceil(total / nbTranches);
    const remaining = total - tranche;

    // 1. Créer la cotisation
    const { data: newCot, error: cotError } = await supabase
      .from("cotisations")
      .insert({
        user_id: user.id,
        product_id: product.id,
        total_price: total,
        amount_paid: tranche,
        amount_remaining: remaining,
        nb_tranches: nbTranches,
        tranche_amount: tranche,
        status: remaining <= 0 ? "completed" : "active",
        withdrawal_code: remaining <= 0
          ? String(Math.floor(100000 + Math.random() * 900000))
          : null,
      })
      .select()
      .single();

    if (cotError || !newCot) {
      setErrorMsg("Erreur lors de la création de la cotisation. Réessayez.");
      setSaving(false);
      return;
    }

    // 2. Enregistrer le premier paiement (simulé)
    await supabase.from("payments").insert({
      cotisation_id: newCot.id,
      user_id: user.id,
      amount: tranche,
      status: "success",
      payment_method: "mobile_money",
      paid_at: new Date().toISOString(),
    });

    router.push("/cotisations?success=1");
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

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Retour */}
      <Link
        href="/catalogue"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      {/* Image + infos produit */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative h-52 bg-lamanne-light flex items-center justify-center">
          {product.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
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
          <h1 className="text-xl font-black text-gray-900 leading-snug">
            {product.name}
          </h1>
          <p className="text-2xl font-black text-lamanne-primary mt-2">
            {formatCFA(product.price)}
          </p>
          {product.description && (
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              {product.description}
            </p>
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
            {product.lot_details
              .split("\n")
              .filter((l) => l.trim())
              .map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lamanne-accent flex-shrink-0" />
                  {line.trim()}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Avertissement cotisation existante */}
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

      {/* Configurateur de cotisation */}
      {!existingCotisation && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <h2 className="font-bold text-gray-900">Configurer ma cotisation</h2>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Sélecteur tranches */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Durée de cotisation
            </label>
            <div className="flex gap-2 flex-wrap">
              {validOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setNbTranches(n)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all",
                    nbTranches === n
                      ? "border-lamanne-primary bg-lamanne-primary text-white"
                      : "border-gray-200 text-gray-600 hover:border-lamanne-accent hover:text-lamanne-accent"
                  )}
                >
                  {n} mois
                </button>
              ))}
            </div>
          </div>

          {/* Résumé */}
          <div className="bg-lamanne-light rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant par tranche</span>
              <span className="font-black text-lamanne-primary text-base">
                {formatCFA(trancheAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Durée totale</span>
              <span className="font-semibold text-gray-800">{nbTranches} mois</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Prix total</span>
              <span className="font-semibold text-gray-800">
                {formatCFA(product.price)}
              </span>
            </div>
            <div className="border-t border-lamanne-accent/20 pt-2 mt-2">
              <p className="text-xs text-gray-500 text-center">
                Vous payez{" "}
                <strong className="text-lamanne-primary">{formatCFA(trancheAmount)}</strong>{" "}
                aujourd&apos;hui, puis{" "}
                <strong>{formatCFA(trancheAmount)}/mois</strong>{" "}
                pendant {nbTranches - 1} mois supplémentaire
                {nbTranches > 2 ? "s" : ""}
              </p>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-bold"
            onClick={handleStartCotisation}
            disabled={saving || product.stock === 0}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Démarrage...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Démarrer ma cotisation
              </span>
            )}
          </Button>

          {product.stock === 0 && (
            <p className="text-center text-sm text-red-500 font-medium">
              Ce produit est en rupture de stock.
            </p>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">{successMsg}</p>
        </div>
      )}
    </div>
  );
}
