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

function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^00/, "+");
}

function phoneToEmail(phone: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `phone_${digits}@lamanne.app`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [tab, setTab] = useState<"email" | "phone">("email");
  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Phone form
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

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

    if (redirectTo !== "/dashboard") return redirectTo;
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

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit être exactement 4 chiffres.");
      setLoading(false);
      return;
    }

    const fakeEmail = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: pin + "LM",
    });

    if (error) {
      setError("Numéro de téléphone ou code PIN incorrect.");
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
        <h2 className="text-2xl font-black text-gray-900">Connexion</h2>
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
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
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
            <Label htmlFor="pin">Code PIN (4 chiffres)</Label>
            <Input id="pin" type="password" inputMode="numeric" maxLength={4}
              placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required className="text-center text-2xl tracking-[0.5em]" style={{ fontSize: "24px" }} />
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
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-lamanne-primary font-black text-xl">LM</span>
            </div>
            <span className="text-white font-black text-2xl tracking-wide">LAMANNE</span>
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
