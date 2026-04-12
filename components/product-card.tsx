"use client";

import Image from "next/image";
import { formatCFA } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
    category?: { name: string } | null;
  };
  onSelect?: (product: ProductCardProps["product"]) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const imageUrl = product.images?.[0] || null;
  const trancheMin = Math.round(product.price / 12);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group animate-fade-in"
      style={{ boxShadow: "var(--shadow-sm)" }}
      onClick={() => onSelect?.(product)}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-[#E8F1FB]" style={{ aspectRatio: "1/1" }}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-[#378ADD]/40" />
          </div>
        )}
        {/* Category badge overlay */}
        {product.category?.name && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[#0D3B8C] text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight">
            {product.category.name}
          </span>
        )}
        {/* Stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            {product.stock} restant{product.stock > 1 ? "s" : ""}
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-900 text-xs font-bold px-3 py-1 rounded-full">Rupture</span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
          {product.name}
        </h3>

        <p className="text-[#0D3B8C] font-black text-lg leading-none mb-0.5">
          {formatCFA(product.price)}
        </p>
        <p className="text-gray-400 text-xs truncate">
          Dès{" "}
          <span className="font-semibold text-[#378ADD]">{formatCFA(trancheMin)}</span>
          /versement
        </p>

        <button
          className="mt-3 w-full bg-[#0D3B8C] hover:bg-[#0D3B8C]/90 text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95"
          style={{ fontSize: 13 }}
          onClick={(e) => { e.stopPropagation(); onSelect?.(product); }}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? "Indisponible" : "Cotiser"}
        </button>
      </div>
    </div>
  );
}
