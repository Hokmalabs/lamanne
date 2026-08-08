import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ShoppingBag, PackageOpen, ArrowRight } from "lucide-react";
import { formatCFA } from "@/lib/utils";
import PublicCatalogueClient from "./PublicCatalogueClient";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function PublicCataloguePage() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    anon.from("products").select("id, name, price, images, stock, category_id, max_tranches").eq("is_active", true).order("name"),
    anon.from("categories").select("id, name").order("name"),
  ]);

  return (
    <div className="min-h-screen bg-lamanne-light">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 0 #E2E6EF" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-sora text-lamanne-primary font-black text-lg tracking-wide">LAMANNE</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-semibold text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              Connexion
            </Link>
            <Link href="/register" className="text-sm font-bold text-white bg-lamanne-primary px-4 py-2 rounded-xl hover:bg-lamanne-primary/90 transition-colors">
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="font-sora text-2xl font-black text-gray-900">Catalogue</h1>
          <p className="text-gray-400 text-sm mt-0.5">Cotisez pour l&apos;article de votre choix</p>
        </div>

        <PublicCatalogueClient
          products={(products ?? []) as any[]}
          categories={(categories ?? []) as any[]}
        />
      </div>
    </div>
  );
}
