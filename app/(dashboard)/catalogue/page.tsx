"use client";

import { useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Product } from "@/lib/types";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const mockCategories = [
  { id: "all", name: "Tout", slug: "all" },
  { id: "1", name: "Téléphones", slug: "telephones" },
  { id: "2", name: "Téléviseurs", slug: "televiseurs" },
  { id: "3", name: "Électroménager", slug: "electromenager" },
  { id: "4", name: "Informatique", slug: "informatique" },
  { id: "5", name: "Audio", slug: "audio" },
];

type ProductWithCategory = Omit<Product, 'category'> & { category?: { name: string } };
const mockProducts: ProductWithCategory[] = [
  {
    id: "1",
    category_id: "1",
    name: "Samsung Galaxy A54 5G — 128 Go Lavande",
    description: "Smartphone Samsung Galaxy A54 5G avec écran Super AMOLED 6,4 pouces",
    price: 250000,
    images: [],
    stock: 15,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Téléphones" },
  },
  {
    id: "2",
    category_id: "2",
    name: "Télévision LG OLED 55\" 4K Smart TV",
    description: "TV OLED 55 pouces 4K Ultra HD avec WebOS",
    price: 650000,
    images: [],
    stock: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Téléviseurs" },
  },
  {
    id: "3",
    category_id: "3",
    name: "Réfrigérateur Samsung 350L Double Portes",
    description: "Réfrigérateur No Frost 350 litres avec distributeur d'eau",
    price: 450000,
    images: [],
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Électroménager" },
  },
  {
    id: "4",
    category_id: "4",
    name: "Laptop HP Pavilion 15\" — Intel Core i5",
    description: "Ordinateur portable HP avec processeur Intel Core i5, 16 Go RAM, SSD 512 Go",
    price: 580000,
    images: [],
    stock: 12,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Informatique" },
  },
  {
    id: "5",
    category_id: "5",
    name: "Écouteurs Sony WH-1000XM5 Bluetooth",
    description: "Casque à réduction de bruit active premium Sony",
    price: 185000,
    images: [],
    stock: 20,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Audio" },
  },
  {
    id: "6",
    category_id: "1",
    name: "iPhone 14 — 128 Go Noir Minuit",
    description: "Apple iPhone 14 avec puce A15 Bionic, appareil photo 12 MP",
    price: 680000,
    images: [],
    stock: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Téléphones" },
  },
  {
    id: "7",
    category_id: "3",
    name: "Machine à laver Hisense 7 kg Automatique",
    description: "Machine à laver frontale automatique 7 kg avec programmes multiples",
    price: 320000,
    images: [],
    stock: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Électroménager" },
  },
  {
    id: "8",
    category_id: "2",
    name: "Télévision TCL 43\" 4K Android TV",
    description: "Smart TV TCL 43 pouces 4K avec Android TV intégré",
    price: 280000,
    images: [],
    stock: 18,
    is_active: true,
    created_at: new Date().toISOString(),
    category: { name: "Téléviseurs" },
  },
];

export default function CataloguePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = mockProducts.filter((p) => {
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
          {filtered.length} article(s) disponible(s)
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
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {mockCategories.map((cat) => (
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

      {/* Grille produits */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <SlidersHorizontal className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun article trouvé</p>
          <p className="text-gray-400 text-sm mt-1">
            Modifiez votre recherche ou sélectionnez une autre catégorie.
          </p>
        </div>
      ) : (
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
