"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppShareButton({
  productName,
  productId,
}: {
  productName: string;
  productId: string;
}) {
  const handleShare = () => {
    const url = `${window.location.origin}/catalogue-public/${productId}`;
    const text = `🛍️ Découvrez "${productName}" sur LAMANNE — Cotisez à votre rythme, sans intérêts !\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-sm font-semibold text-[#25D366] bg-[#25D366]/10 px-3 py-1.5 rounded-xl hover:bg-[#25D366]/20 transition-colors"
      aria-label="Partager sur WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">Partager</span>
    </button>
  );
}
