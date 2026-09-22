"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import ProductForm, { type ProductFormInitial } from "../../ProductForm";

function RetourLink() {
  return (
    <Link
      href="/admin/produits"
      className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-gray-500 hover:text-gray-700"
    >
      <ChevronLeft className="h-4 w-4" />
      Retour aux produits
    </Link>
  );
}

export default function ModifierProduitPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setLoadError("Impossible de charger le produit.");
      } else {
        setProduct((data as Product | null) ?? null);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-2xl h-64 animate-pulse border border-gray-100" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl space-y-5">
        <RetourLink />
        <div
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          {loadError}
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl space-y-5">
        <RetourLink />
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <p className="text-gray-500 font-medium">Produit introuvable</p>
          <Button asChild className="mt-4 min-h-[44px]">
            <Link href="/admin/produits">Retour aux produits</Link>
          </Button>
        </div>
      </div>
    );
  }

  const initial: ProductFormInitial = {
    name: product.name,
    description: product.description ?? "",
    price: product.price,
    category_id: product.category_id ?? null,
    stock: product.stock,
    is_lot: product.is_lot ?? false,
    lot_details: product.lot_details ?? null,
    min_tranches: product.min_tranches ?? 1,
    max_tranches: product.max_tranches ?? 6,
    delivery_days: product.delivery_days ?? 1,
    is_active: product.is_active,
    images: product.images ?? [],
  };

  return (
    <div className="max-w-2xl space-y-5">
      <RetourLink />

      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Modifier le produit</h1>
        <p className="text-gray-500 text-sm mt-0.5">{product.name}</p>
      </div>

      <ProductForm mode="edit" productId={id} initial={initial} />
    </div>
  );
}
