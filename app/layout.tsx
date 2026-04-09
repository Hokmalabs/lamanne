import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LAMANNE — Achetez en cotisant progressivement",
    template: "%s | LAMANNE",
  },
  description:
    "LAMANNE est la plateforme e-commerce ivoirienne où vous achetez vos articles préférés en payant en plusieurs tranches. Choisissez, cotisez, retirez !",
  keywords: ["LAMANNE", "e-commerce", "cotisation", "Côte d'Ivoire", "FCFA", "paiement échelonné"],
  authors: [{ name: "LAMANNE" }],
  openGraph: {
    title: "LAMANNE — Achetez en cotisant progressivement",
    description: "Payez vos articles en plusieurs tranches et retirez-les quand c'est payé.",
    type: "website",
    locale: "fr_CI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
