"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Product, Category } from "@/lib/types";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Edit, EyeOff, Eye, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";

type ProductWithCategory = Product & { category?: Pick<Category, "name"> };

export default function AdminProduitsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(name)")
      .order("created_at", { ascending: false });
    if (data) setProducts(data as ProductWithCategory[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleActive = async (product: ProductWithCategory) => {
    setTogglingId(product.id);
    await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);
    await fetchProducts();
    setTogglingId(null);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {products.length} produit(s) au total
          </p>
        </div>
        <Link href="/admin/produits/nouveau">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun produit</p>
          <Link href="/admin/produits/nouveau">
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le premier produit
            </Button>
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 px-5 py-4">
                {/* Image placeholder */}
                <div className="w-12 h-12 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
                  {product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                  ) : product.is_lot ? (
                    <Package className="h-5 w-5 text-lamanne-accent" />
                  ) : (
                    <ShoppingBag className="h-5 w-5 text-lamanne-accent" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                    {product.is_lot && (
                      <span className="text-xs bg-lamanne-accent/10 text-lamanne-accent font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        LOT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">{product.category?.name ?? "—"}</span>
                    <span className="text-xs font-semibold text-lamanne-primary">
                      {formatCFA(product.price)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {product.stock} en stock · max {product.max_tranches} mois
                    </span>
                  </div>
                </div>

                {/* Statut */}
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    product.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.is_active ? "Actif" : "Inactif"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/admin/produits/${product.id}/modifier`}>
                    <Button size="sm" variant="outline" className="h-8 px-3">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => toggleActive(product)}
                    disabled={togglingId === product.id}
                  >
                    {product.is_active
                      ? <EyeOff className="h-3.5 w-3.5 text-red-500" />
                      : <Eye className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
