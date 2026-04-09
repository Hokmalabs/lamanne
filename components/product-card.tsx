"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatCFA } from "@/lib/utils";
import { ShoppingBag, Plus } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
  };
  onSelect?: (product: ProductCardProps["product"]) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  const imageUrl = product.images[0] || null;
  const trancheMin = Math.round(product.price / 12);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative h-44 bg-lamanne-light overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-lamanne-accent/50" />
          </div>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-2 right-2 bg-lamanne-warning text-white text-xs font-semibold px-2 py-1 rounded-full">
            {product.stock} restant(s)
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-3 space-y-1">
          <p className="text-lg font-bold text-lamanne-primary">
            {formatCFA(product.price)}
          </p>
          <p className="text-xs text-gray-500">
            Dès <span className="font-semibold text-lamanne-accent">{formatCFA(trancheMin)}/tranche</span>
          </p>
        </div>

        <Button
          onClick={() => onSelect?.(product)}
          className="w-full mt-4"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Commencer à cotiser
        </Button>
      </div>
    </div>
  );
}
