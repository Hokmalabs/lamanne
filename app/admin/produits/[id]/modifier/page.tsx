"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Category, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

const TRANCHES_OPTIONS = [1, 2, 3, 6, 10, 12];

export default function ModifierProduitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    stock: "1",
    is_lot: false,
    lot_details: "",
    min_tranches: 1,
    max_tranches: 6,
    delivery_days: 1,
    is_active: true,
  });

  useEffect(() => {
    async function load() {
      const [{ data: prod }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*").eq("id", id).single(),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (cats) setCategories(cats);
      if (prod) {
        const p = prod as Product;
        setForm({
          name: p.name,
          description: p.description,
          price: String(p.price),
          category_id: p.category_id,
          stock: String(p.stock),
          is_lot: p.is_lot ?? false,
          lot_details: p.lot_details ?? "",
          min_tranches: p.min_tranches ?? 1,
          max_tranches: p.max_tranches ?? 6,
          delivery_days: (p as any).delivery_days ?? 1,
          is_active: p.is_active,
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: form.name,
        description: form.description,
        price: parseInt(form.price.replace(/\s/g, ""), 10),
        category_id: form.category_id,
        stock: parseInt(form.stock, 10),
        is_lot: form.is_lot,
        lot_details: form.is_lot ? form.lot_details : null,
        min_tranches: form.min_tranches,
        max_tranches: form.max_tranches,
        delivery_days: form.delivery_days,
        is_active: form.is_active,
      })
      .eq("id", id);

    if (updateError) {
      setError(`Erreur : ${updateError.message}`);
      setSaving(false);
      return;
    }

    router.push("/admin/produits");
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/produits"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux produits
      </Link>

      <div>
        <h1 className="text-2xl font-black text-gray-900">Modifier le produit</h1>
        <p className="text-gray-500 text-sm mt-0.5">{form.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Infos de base */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Informations générales</h2>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                min={1}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Catégorie</Label>
            <select
              id="category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary bg-white"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Statut actif */}
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">Produit visible</p>
              <p className="text-xs text-gray-400">Le produit apparaît dans le catalogue</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.is_active ? "bg-lamanne-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.is_active ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Lot */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Type : Lot</h2>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_lot: !form.is_lot })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.is_lot ? "bg-lamanne-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.is_lot ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {form.is_lot && (
            <div className="space-y-1.5">
              <Label htmlFor="lot_details">Détail du lot</Label>
              <textarea
                id="lot_details"
                value={form.lot_details}
                onChange={(e) => setForm({ ...form, lot_details: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-lamanne-primary"
                rows={4}
              />
            </div>
          )}
        </div>

        {/* Durée */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-900">Durée de cotisation</h2>

          <div className="space-y-2">
            <Label>Durée minimum</Label>
            <div className="flex gap-2 flex-wrap">
              {TRANCHES_OPTIONS.filter((n) => n <= form.max_tranches).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, min_tranches: n })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                    form.min_tranches === n
                      ? "border-lamanne-primary bg-lamanne-primary text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {n} mois
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Durée maximum</Label>
            <div className="flex gap-2 flex-wrap">
              {TRANCHES_OPTIONS.filter((n) => n >= form.min_tranches).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, max_tranches: n })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                    form.max_tranches === n
                      ? "border-lamanne-primary bg-lamanne-primary text-white"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {n} mois
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Délai de livraison */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="font-bold text-gray-900">Délai de livraison</h2>
            <p className="text-xs text-gray-500 mt-0.5">Jours après la fin de cotisation</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, delivery_days: Math.max(1, form.delivery_days - 1) })}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-lamanne-primary transition-colors"
            >
              −
            </button>
            <span className="text-2xl font-black text-gray-900 w-12 text-center">{form.delivery_days}</span>
            <button
              type="button"
              onClick={() => setForm({ ...form, delivery_days: Math.min(30, form.delivery_days + 1) })}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold hover:border-lamanne-primary transition-colors"
            >
              +
            </button>
            <span className="text-sm text-gray-500">jour{form.delivery_days > 1 ? "s" : ""}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/produits" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Annuler</Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sauvegarde...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Enregistrer les modifications
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
