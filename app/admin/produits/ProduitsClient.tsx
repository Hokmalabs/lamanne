"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiPatch, ApiClientError } from "@/lib/api-client";
import { Product, Category } from "@/lib/types";
import { formatCFA } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Edit, EyeOff, Eye, Package, ShoppingBag, Search, X } from "lucide-react";
import Link from "next/link";

type ProductWithCategory = Product & { category?: Pick<Category, "name"> };

const ALL_CATEGORIES = "__all__";

// Recherche insensible à la casse ET aux accents (« café » trouve « cafe »)
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export default function AdminProduitsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(name)")
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError("Impossible de charger les produits.");
    } else {
      setLoadError(null);
      setProducts((data ?? []) as ProductWithCategory[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleActive = async (product: ProductWithCategory) => {
    setActionError(null);
    setTogglingId(product.id);
    try {
      await apiPatch(`/api/admin/produits/${product.id}`, {
        is_active: !product.is_active,
      });
      await fetchProducts();
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : "Erreur réseau";
      setActionError(`Impossible de modifier le produit : ${message}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Catégories dérivées des produits chargés (pas de requête supplémentaire)
  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const p of products) {
      if (p.category?.name) names.add(p.category.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "fr"));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = normalize(search.trim());
    return products.filter((p) => {
      const matchesSearch = needle === "" || normalize(p.name).includes(needle);
      const matchesCategory =
        category === ALL_CATEGORIES || p.category?.name === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const isFiltered = search.trim() !== "" || category !== ALL_CATEGORIES;

  const resetFilters = () => {
    setSearch("");
    setCategory(ALL_CATEGORIES);
  };

  const trancheLabel = (product: ProductWithCategory) =>
    product.min_tranches === product.max_tranches
      ? `${product.max_tranches} mois`
      : `${product.min_tranches} à ${product.max_tranches} mois`;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-black text-gray-900">Produits</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isFiltered
              ? `${filtered.length} sur ${products.length} produit(s)`
              : `${products.length} produit(s)`}
          </p>
        </div>
        <Link href="/admin/produits/nouveau" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un produit
          </Button>
        </Link>
      </div>

      {/* Erreur d'action (toggle) */}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3 flex items-start justify-between gap-3"
        >
          <span>{actionError}</span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setActionError(null)}
            className="flex-shrink-0 -my-2 -mr-2 h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-lamanne-danger/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Recherche + catégories */}
      {!loading && !loadError && products.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-lamanne-primary transition-colors"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[{ label: "Toutes", value: ALL_CATEGORIES }, ...categories.map((name) => ({ label: name, value: name }))].map(
              ({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold border transition-colors flex-shrink-0 whitespace-nowrap ${
                    category === value
                      ? "bg-lamanne-primary text-white border-lamanne-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Squelette */}
      {loading && (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse border border-gray-100" />
          ))}
        </div>
      )}

      {/* Erreur de chargement */}
      {!loading && loadError && (
        <div
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          {loadError}
        </div>
      )}

      {/* Aucun produit du tout */}
      {!loading && !loadError && products.length === 0 && (
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

      {/* Aucun résultat pour les filtres */}
      {!loading && !loadError && products.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun produit ne correspond</p>
          <Button variant="outline" className="mt-4" onClick={resetFilters}>
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* Liste */}
      {!loading && !loadError && filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((product) => {
            const isToggling = togglingId === product.id;
            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${
                  product.is_active ? "" : "opacity-70"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt={product.name} className="w-16 h-16 rounded-xl object-cover" />
                    ) : product.is_lot ? (
                      <Package className="h-6 w-6 text-lamanne-accent" />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-lamanne-accent" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="font-semibold text-gray-900 text-sm line-clamp-2">{product.name}</p>
                      {product.is_lot && (
                        <span className="bg-lamanne-soft text-lamanne-primary text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                          LOT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{product.category?.name ?? "—"}</p>
                    <p className="font-sora font-bold text-lamanne-primary mt-1">{formatCFA(product.price)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {product.stock === 0 ? (
                        <span className="text-lamanne-danger font-semibold">Rupture</span>
                      ) : (
                        <span>{product.stock} en stock</span>
                      )}
                      {" · "}
                      {trancheLabel(product)}
                    </p>
                  </div>
                </div>

                {/* Statut + actions */}
                <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      product.is_active
                        ? "bg-lamanne-success/10 text-lamanne-success"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {product.is_active ? "Actif" : "Inactif"}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="icon" className="h-11 w-11">
                      <Link
                        href={`/admin/produits/${product.id}/modifier`}
                        aria-label="Modifier le produit"
                        title="Modifier le produit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-11 w-11 ${isToggling ? "opacity-50" : ""}`}
                      onClick={() => toggleActive(product)}
                      disabled={isToggling}
                      aria-label={product.is_active ? "Masquer du catalogue" : "Remettre au catalogue"}
                      title={product.is_active ? "Masquer du catalogue" : "Remettre au catalogue"}
                    >
                      {product.is_active
                        ? <EyeOff className="h-4 w-4 text-lamanne-danger" />
                        : <Eye className="h-4 w-4 text-lamanne-success" />}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
