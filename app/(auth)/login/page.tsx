"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, LogIn, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^00/, "+");
}

function phoneToEmail(phone: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `phone_${digits}@lamanne.app`;
}

/**
 * Traduit la saisie de l'onglet Téléphone en mot de passe Supabase.
 *
 * Deux publics cohabitent : les clients (PIN 4 chiffres, historique) et les
 * membres de l'équipe (mot de passe fort XXXX-XXXX-XXXX). La saisie du mot de
 * passe fort est tolérante : minuscules, espaces ou tirets oubliés.
 */
// Non exportée : un page.tsx Next.js ne peut exporter que default et la config de route.
function resolvePhonePassword(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;

  // TEMPORAIRE — PIN client legacy, supprimé par feat/auth-pin
  if (/^\d{4}$/.test(v)) return v + "LM";

  const compact = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length === 12) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8, 12)}`;
  }

  return v.toUpperCase();
}

/**
 * Filtre la destination de redirection après connexion.
 *
 * Empêche /login?redirectTo=//site-pirate de renvoyer l'utilisateur hors de
 * LAMANNE juste après sa connexion (hameçonnage).
 */
// Non exportée : un page.tsx Next.js ne peut exporter que default et la config de route.
function safeRedirect(raw: string | null): string | null {
  if (!raw) return null;

  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.includes("\\")) return null;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirectTo = searchParams.get("redirectTo");

  const [tab, setTab] = useState<"email" | "phone">("email");
  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Phone form
  const [phone, setPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [showPhonePassword, setShowPhonePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRedirectAndCheck = async (userId: string): Promise<string | null> => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_suspended")
      .eq("id", userId)
      .single();

    if (profile?.is_suspended) {
      await supabase.auth.signOut();
      setError("Votre compte a été suspendu. Contactez l'administrateur.");
      setLoading(false);
      return null;
    }

    const requested = safeRedirect(rawRedirectTo);
    if (requested && requested !== "/dashboard") return requested;

    if (profile?.role === "super_admin" || profile?.role === "admin") return "/admin";
    if (profile?.role === "commercial") return "/commercial";
    return "/dashboard";
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }
    const dest = await getRedirectAndCheck(data.user.id);
    if (!dest) return;
    router.push(dest);
    router.refresh();
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const resolved = resolvePhonePassword(phonePassword);
    if (!resolved) {
      setError("Saisissez votre code PIN ou votre mot de passe.");
      setLoading(false);
      return;
    }

    const fakeEmail = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: resolved,
    });

    if (error) {
      // Message unique : ne pas révéler si le numéro existe
      setError("Numéro ou code incorrect.");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const dest = user ? await getRedirectAndCheck(user.id) : "/dashboard";
    if (!dest) return;
    router.push(dest);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8">
      <div className="mb-6">
        <h2 className="font-sora text-2xl font-black text-gray-900">Connexion</h2>
        <p className="text-gray-500 text-sm mt-1">
          Bon retour ! Entrez vos identifiants pour continuer.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-6">
        {([
          { key: "email" as const, label: "Email", icon: Mail },
          { key: "phone" as const, label: "Téléphone", icon: Phone },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          {error}
        </div>
      )}

      {tab === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" type="email" placeholder="vous@exemple.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              style={{ fontSize: "16px" }} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link href="/forgot-password" className="text-xs text-lamanne-accent hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required
                autoComplete="current-password" className="pr-11" style={{ fontSize: "16px" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion...</span>
              : <span className="flex items-center gap-2"><LogIn className="h-5 w-5" />Se connecter</span>}
          </Button>
        </form>
      ) : (
        <form onSubmit={handlePhoneLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input id="phone" type="tel" placeholder="+225 07 00 00 00 00" value={phone}
              onChange={(e) => setPhone(e.target.value)} required autoComplete="tel"
              style={{ fontSize: "16px" }} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone-password">Code PIN ou mot de passe</Label>
            <div className="relative">
              <Input
                id="phone-password"
                type={showPhonePassword ? "text" : "password"}
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                required
                autoComplete="current-password"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={64}
                className="pr-11"
                style={{ fontSize: "16px" }}
              />
              <button type="button" onClick={() => setShowPhonePassword(!showPhonePassword)}
                aria-label={showPhonePassword ? "Masquer le code" : "Afficher le code"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPhonePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
            {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Connexion...</span>
              : <span className="flex items-center gap-2"><Phone className="h-5 w-5" />Se connecter</span>}
          </Button>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-lamanne-accent font-semibold hover:underline">
            S&apos;inscrire gratuitement
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-lamanne-primary to-lamanne-accent flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Logo size={48} />
            <span className="font-sora text-white font-black text-2xl tracking-wide">LAMANNE</span>
            <span className="text-white/60 text-sm">Cotisation progressive</span>
          </Link>
        </div>
        <Suspense fallback={<div className="bg-white rounded-3xl shadow-2xl p-8 h-64 animate-pulse" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-white/50 text-xs mt-6">
          © {new Date().getFullYear()} LAMANNE — Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  );
}
