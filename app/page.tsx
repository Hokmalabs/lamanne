import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  CreditCard,
  QrCode,
  CheckCircle,
  ArrowRight,
  Star,
  Shield,
  Zap,
  Users,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-lamanne-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs">LM</span>
            </div>
            <span className="text-lamanne-primary font-black text-xl tracking-wide">LAMANNE</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">S&apos;inscrire</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-lamanne-primary via-lamanne-primary to-lamanne-accent relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-lamanne-light rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>La plateforme #1 de cotisation progressive en Côte d&apos;Ivoire</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Vos achats en{" "}
            <span className="text-yellow-300">plusieurs tranches,</span>
            <br />
            sans stress.
          </h1>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Choisissez vos articles préférés, payez progressivement à votre rythme,
            et retirez-les en boutique dès que le paiement est complet. Simple, sécurisé et accessible à tous.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-lamanne-primary hover:bg-lamanne-light font-bold text-base px-8 h-14 rounded-xl w-full sm:w-auto"
              >
                Commencer maintenant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 font-bold text-base px-8 h-14 rounded-xl w-full sm:w-auto"
              >
                Se connecter
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: "5 000+", label: "Clients satisfaits" },
              { value: "1 200+", label: "Articles disponibles" },
              { value: "98%", label: "Taux de satisfaction" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                <p className="text-xs md:text-sm text-white/60 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20 bg-lamanne-light/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-lamanne-accent font-semibold text-sm uppercase tracking-widest mb-3">
              Simple & rapide
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-lamanne-primary">
              Comment ça marche ?
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              En 3 étapes simples, commencez à cotiser pour vos articles préférés
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Ligne de connexion (desktop) */}
            <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-lamanne-accent/30" />

            {[
              {
                step: "1",
                icon: ShoppingBag,
                title: "Choisissez votre article",
                description:
                  "Parcourez notre catalogue et sélectionnez l'article que vous souhaitez acquérir. Téléphones, TV, électroménager...",
                color: "bg-lamanne-primary",
              },
              {
                step: "2",
                icon: CreditCard,
                title: "Cotisez progressivement",
                description:
                  "Payez en plusieurs tranches selon votre budget. Chaque versement vous rapproche de votre objectif.",
                color: "bg-lamanne-accent",
              },
              {
                step: "3",
                icon: QrCode,
                title: "Retirez en boutique",
                description:
                  "Une fois 100% payé, recevez votre code unique et venez retirer votre article dans notre boutique partenaire.",
                color: "bg-lamanne-success",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 relative"
                >
                  <div
                    className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-lamanne-primary text-white text-sm font-black rounded-full flex items-center justify-center shadow">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <p className="text-lamanne-accent font-semibold text-sm uppercase tracking-widest mb-3">
              Pourquoi LAMANNE ?
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-lamanne-primary">
              Vos avantages
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "100% Sécurisé",
                description: "Vos paiements sont protégés et vos données chiffrées.",
                color: "text-lamanne-primary",
                bg: "bg-lamanne-light",
              },
              {
                icon: Zap,
                title: "Rapide & Simple",
                description: "Commencez à cotiser en moins de 5 minutes.",
                color: "text-lamanne-accent",
                bg: "bg-blue-50",
              },
              {
                icon: Users,
                title: "Accessible à tous",
                description: "Pas de conditions de revenus ni de justificatifs requis.",
                color: "text-lamanne-success",
                bg: "bg-green-50",
              },
              {
                icon: CheckCircle,
                title: "Sans intérêts",
                description: "Vous payez exactement le prix affiché, rien de plus.",
                color: "text-lamanne-warning",
                bg: "bg-orange-50",
              },
            ].map((adv) => {
              const Icon = adv.icon;
              return (
                <div key={adv.title} className="text-center p-6">
                  <div
                    className={`w-14 h-14 ${adv.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                  >
                    <Icon className={`h-7 w-7 ${adv.color}`} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{adv.title}</h3>
                  <p className="text-gray-500 text-sm">{adv.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-lamanne-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5">
            Prêt à commencer ?
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            Rejoignez des milliers d&apos;Ivoiriens qui achètent malin avec LAMANNE.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-white text-lamanne-primary hover:bg-lamanne-light font-bold text-base px-10 h-14 rounded-xl"
            >
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lamanne-accent rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">LM</span>
              </div>
              <span className="text-white font-bold text-lg">LAMANNE</span>
            </div>
            <p className="text-sm text-center">
              © {new Date().getFullYear()} LAMANNE — Tous droits réservés. Côte d&apos;Ivoire.
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/mentions-legales" className="hover:text-white transition-colors">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="hover:text-white transition-colors">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
