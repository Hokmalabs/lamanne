"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductForm from "../ProductForm";

export default function NouveauProduitPage() {
  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/produits"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux produits
      </Link>

      <div>
        <h1 className="font-sora text-2xl font-black text-gray-900">Ajouter un produit</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Renseignez les informations du nouveau produit
        </p>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
