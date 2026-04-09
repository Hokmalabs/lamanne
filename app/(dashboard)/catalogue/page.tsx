"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Category, Product } from "@/lib/types";
import { Search, SlidersHorizontal, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type ProductWithCategory = Product & { category?: Pick<Category, "name"> };

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("products")
          .select("*, category:categories(name)")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (cats) setCategories(cats);
      if (prods) setProducts(prods as ProductWithCategory[]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || p.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Catalogue</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {loading ? "Chargement..." : `${filtered.length} article(s) disponible(s)`}
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          placeholder="Rechercher un article..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtres catégories */}
      {!loading && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all",
              activeCategory === "all"
                ? "bg-lamanne-primary text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-lamanne-accent hover:text-lamanne-accent"
            )}
          >
            Tout
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                activeCategory === cat.id
                  ? "bg-lamanne-primary text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-lamanne-accent hover:text-lamanne-accent"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton chargement */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* État vide — pas encore de produits */}
      {!loading && products.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
          <PackageOpen className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-600 text-lg mb-1">
            Catalogue bientôt disponible
          </h3>
          <p className="text-gray-400 text-sm">
            Nos produits arrivent prochainement. Revenez bientôt !
          </p>
        </div>
      )}

      {/* Aucun résultat de recherche */}
      {!loading && products.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <SlidersHorizontal className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun article trouvé</p>
          <p className="text-gray-400 text-sm mt-1">
            Modifiez votre recherche ou sélectionnez une autre catégorie.
          </p>
        </div>
      )}

      {/* Grille produits */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={(p) => {
                console.log("Cotiser pour:", p.name);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
