"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, SlidersHorizontal, PackageOpen } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Product = { id: string; name: string; price: number; images: string[] | null; stock: number; category_id: string; max_tranches: number };
type Category = { id: string; name: string };

export default function PublicCatalogueClient({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "all" || p.category_id === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <>
      {/* Search */}
      <div className="sticky top-14 z-10 -mx-4 px-4 py-2 bg-[#F8F9FC]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher un article…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#0D3B8C]/20 transition-all"
            style={{ boxShadow: "var(--shadow-sm)", fontSize: "16px" }}
          />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="-mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                activeCategory === "all" ? "bg-[#0D3B8C] text-white" : "bg-white text-gray-500 border border-gray-200"
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
                  activeCategory === cat.id ? "bg-[#0D3B8C] text-white" : "bg-white text-gray-500 border border-gray-200"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty states */}
      {products.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-14 text-center">
          <PackageOpen className="h-10 w-10 text-gray-300 mx-auto mb-4" />
          <p className="font-bold text-gray-600">Catalogue bientôt disponible</p>
        </div>
      )}
      {products.length > 0 && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <SlidersHorizontal className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun article trouvé</p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
          {filtered.map((p) => {
            const dailyCost = Math.ceil(p.price / (p.max_tranches * 30));
            return (
              <Link
                key={p.id}
                href={`/catalogue-public/${p.id}`}
                className="bg-white rounded-2xl overflow-hidden group transition-all hover:shadow-md active:scale-98"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="relative bg-[#F8F9FC]" style={{ aspectRatio: "1/1" }}>
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-10 w-10 text-gray-200" />
                    </div>
                  )}
                  {p.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-t-2xl">
                      <span className="text-white text-xs font-bold bg-black/60 px-2 py-1 rounded-full">Rupture</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug mb-1">{p.name}</p>
                  <p className="text-base font-black text-[#0D3B8C]">{formatCFA(p.price)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">≈ {formatCFA(dailyCost)}/jour</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
