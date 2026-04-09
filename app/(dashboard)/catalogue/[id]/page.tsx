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
  CreditCard,
  AlertTriangle,
  Calendar,
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
  const [firstPayment, setFirstPayment] = useState<number | "">(1000);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [{ data: prod }, { data: { user } }] = await Promise.all([
        supabase.from("products").select("*, category:categories(name)").eq("id", id).single(),
        supabase.auth.getUser(),
      ]);

      if (!prod) { setLoading(false); return; }
      setProduct(prod as Product);

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

  const deadline = product ? addMonths(product.max_tranches) : null;
  const firstPaymentNum = typeof firstPayment === "number" ? firstPayment : 0;
  const remaining = product ? product.price - firstPaymentNum : 0;

  const handleStartCotisation = async () => {
    if (!product) return;
    if (firstPaymentNum < 1000) {
      setErrorMsg("Le premier versement doit être d'au moins 1 000 FCFA.");
      return;
    }
    if (firstPaymentNum > product.price) {
      setErrorMsg("Le versement ne peut pas dépasser le prix total.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const isComplete = firstPaymentNum >= product.price;

    const { data: newCot, error: cotError } = await supabase
      .from("cotisations")
      .insert({
        user_id: user.id,
        product_id: product.id,
        total_price: product.price,
        amount_paid: firstPaymentNum,
        amount_remaining: Math.max(0, product.price - firstPaymentNum),
        nb_tranches: 1,
        tranche_amount: firstPaymentNum,
        status: isComplete ? "completed" : "active",
        withdrawal_code: isComplete
          ? String(Math.floor(100000 + Math.random() * 900000))
          : null,
      })
      .select()
      .single();

    if (cotError || !newCot) {
      console.error("[Cotisation] insert error:", cotError);
      setErrorMsg(`Erreur : ${cotError?.message ?? "création impossible"}`);
      setSaving(false);
      return;
    }

    await supabase.from("payments").insert({
      cotisation_id: newCot.id,
      user_id: user.id,
      amount: firstPaymentNum,
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
          <h1 className="text-xl font-black text-gray-900 leading-snug">{product.name}</h1>
          <p className="text-2xl font-black text-lamanne-primary mt-2">{formatCFA(product.price)}</p>
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
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-blue-800">
            Vous avez {product.max_tranches} mois pour compléter votre cotisation
          </p>
          {deadline && (
            <p className="text-blue-600 mt-0.5">
              Date limite : {formatDate(deadline.toISOString())}
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
          <h2 className="font-bold text-gray-900">Démarrer ma cotisation</h2>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Premier versement */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">
              Premier versement (FCFA)
            </label>
            <input
              type="number"
              min={1000}
              max={product.price}
              step={500}
              value={firstPayment}
              onChange={(e) => setFirstPayment(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
              placeholder="ex : 25 000"
            />
            <p className="text-xs text-gray-400">Minimum 1 000 FCFA</p>
          </div>

          {/* Résumé */}
          {firstPaymentNum >= 1000 && (
            <div className="bg-lamanne-light rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Vous payez aujourd&apos;hui</span>
                <span className="font-black text-lamanne-primary text-base">
                  {formatCFA(firstPaymentNum)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reste à verser</span>
                <span className="font-semibold text-gray-800">{formatCFA(Math.max(0, remaining))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Prix total</span>
                <span className="font-semibold text-gray-800">{formatCFA(product.price)}</span>
              </div>
              {deadline && remaining > 0 && (
                <div className="border-t border-lamanne-accent/20 pt-2 mt-2">
                  <p className="text-xs text-gray-500 text-center">
                    Il vous reste{" "}
                    <strong className="text-lamanne-primary">{formatCFA(remaining)}</strong>{" "}
                    à verser avant le{" "}
                    <strong>{formatDate(deadline.toISOString())}</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full h-12 text-base font-bold"
            onClick={handleStartCotisation}
            disabled={saving || product.stock === 0 || firstPaymentNum < 1000}
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
    </div>
  );
}
