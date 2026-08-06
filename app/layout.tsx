import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import InstallPWA from "@/components/InstallPWA";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LAMANNE — Achetez en cotisant progressivement",
    template: "%s | LAMANNE",
  },
  description:
    "LAMANNE est la plateforme ivoirienne où vous achetez vos articles préférés en payant en plusieurs versements. Choisissez, cotisez, retirez !",
  keywords: ["LAMANNE", "e-commerce", "cotisation", "Côte d'Ivoire", "FCFA", "paiement échelonné"],
  authors: [{ name: "LAMANNE" }],
  openGraph: {
    title: "LAMANNE — Achetez en cotisant progressivement",
    description: "Payez vos articles en plusieurs versements et retirez-les quand c'est payé.",
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
    <html lang="fr" className={`${inter.variable} ${sora.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F5132" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LAMANNE" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <InstallPWA />
      </body>
    </html>
  );
}
