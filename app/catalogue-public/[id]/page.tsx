import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Calendar, Share2 } from "lucide-react";
import { formatCFA, formatDate } from "@/lib/utils";
import PaymentSimulator from "./PaymentSimulator";
import WhatsAppShareButton from "./WhatsAppShareButton";

export const dynamic = "force-dynamic";

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function PublicProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: product } = await anon
    .from("products")
    .select("*, category:categories(name)")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + (product.max_tranches ?? 6));

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100" style={{ boxShadow: "0 1px 0 #E2E6EF" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/catalogue-public" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" />
            Catalogue
          </Link>
          <div className="flex items-center gap-2">
            <WhatsAppShareButton productName={product.name} productId={id} />
            <Link href="/login" className="text-sm font-semibold text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              Connexion
            </Link>
            <Link href="/register" className="text-sm font-bold text-white bg-[#0D3B8C] px-4 py-2 rounded-xl hover:bg-[#0D3B8C]/90 transition-colors">
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Product card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="relative h-56 bg-[#F8F9FC] flex items-center justify-center">
            {product.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <ShoppingBag className="h-16 w-16 text-gray-200" />
            )}
            {product.stock === 0 && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-sm font-bold bg-black/60 px-3 py-1.5 rounded-full">Rupture de stock</span>
              </div>
            )}
          </div>
          <div className="p-5">
            {(product.category as any)?.name && (
              <p className="text-xs text-[#378ADD] font-semibold uppercase tracking-wide mb-1">
                {(product.category as any).name}
              </p>
            )}
            <h1 className="text-xl font-black text-gray-900 leading-snug">{product.name}</h1>
            <p className="text-2xl font-black text-[#0D3B8C] mt-2">{formatCFA(product.price)}</p>
            {product.description && (
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{product.description}</p>
            )}
          </div>
        </div>

        {/* Duration info */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-800">
              {product.max_tranches} mois pour compléter votre cotisation
            </p>
            <p className="text-blue-600 mt-0.5">
              Date limite : {formatDate(deadline.toISOString())}
            </p>
            {product.delivery_days && (
              <p className="text-blue-600 mt-0.5">
                Livraison : {product.delivery_days} jour{product.delivery_days > 1 ? "s" : ""} après complétion
              </p>
            )}
          </div>
        </div>

        {/* Payment simulator */}
        <PaymentSimulator price={product.price} maxMonths={product.max_tranches ?? 6} />

        {/* CTA */}
        <div className="bg-[#0D3B8C] rounded-2xl p-5 text-center">
          <p className="text-white font-bold mb-1">Prêt à cotiser ?</p>
          <p className="text-white/70 text-sm mb-4">Créez un compte gratuit pour démarrer</p>
          <Link
            href="/register"
            className="inline-block w-full bg-white text-[#0D3B8C] font-black py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Créer mon compte — C&apos;est gratuit
          </Link>
        </div>
      </div>
    </div>
  );
}
