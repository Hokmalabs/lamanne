"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, UserPlus, CheckCircle, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, "").replace(/^00/, "+");
}

function phoneToEmail(phone: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  return `phone_${digits}@lamanne.app`;
}

export default function RegisterPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"email" | "phone">("email");

  // Common
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Email mode
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone mode
  const [pin, setPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState("");

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Cet email est déjà utilisé. Veuillez vous connecter."
          : `Erreur : ${signUpError.message}`
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSuccessEmail(email);
    setSuccess(true);
    setLoading(false);
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!phone.trim()) {
      setError("Le numéro de téléphone est requis.");
      setLoading(false);
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit être exactement 4 chiffres.");
      setLoading(false);
      return;
    }

    const fakeEmail = phoneToEmail(phone);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: fakeEmail,
      password: pin + "LM",
      options: { data: { full_name: fullName, phone: normalizePhone(phone) } },
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter."
          : `Erreur : ${signUpError.message}`
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Phone accounts are usually auto-confirmed (no email verification)
    router.push("/dashboard");
    router.refresh();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-lamanne-primary to-lamanne-accent flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-lamanne-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-lamanne-success" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Compte créé !</h2>
          <p className="text-gray-500 mb-6">
            Un email de confirmation vous a été envoyé à{" "}
            <strong>{successEmail}</strong>. Vérifiez votre boîte mail pour
            activer votre compte.
          </p>
          <Link href="/login">
            <Button className="w-full">Aller à la connexion</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lamanne-primary to-lamanne-accent flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-lamanne-primary font-black text-xl">LM</span>
            </div>
            <span className="text-white font-black text-2xl tracking-wide">LAMANNE</span>
            <span className="text-white/60 text-sm">Rejoignez-nous gratuitement</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900">Créer un compte</h2>
            <p className="text-gray-500 text-sm mt-1">
              Commencez à cotiser pour vos articles préférés.
            </p>
          </div>

          {/* Tabs */}
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

          {/* Shared: full name */}
          <div className="space-y-1.5 mb-4">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Kouassi Ama Marie"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              style={{ fontSize: "16px" }}
            />
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone-email">Numéro de téléphone</Label>
                <Input
                  id="phone-email"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-11"
                    style={{ fontSize: "16px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          password.length >= i * 2
                            ? password.length >= 8
                              ? "bg-lamanne-success"
                              : "bg-lamanne-warning"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold mt-2" disabled={loading}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                  : <span className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Créer mon compte</span>}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePhoneRegister} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone-tel">Numéro de téléphone</Label>
                <Input
                  id="phone-tel"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pin">Code PIN (4 chiffres)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required
                  className="text-center text-2xl tracking-[0.5em]"
                  style={{ fontSize: "24px" }}
                />
                <p className="text-xs text-gray-400">
                  Ce code vous servira à vous connecter. Choisissez-le bien.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  <strong>Sans email</strong> — votre numéro de téléphone et code PIN seront vos seuls identifiants. Mémorisez-les bien.
                </p>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                  : <span className="flex items-center gap-2"><Phone className="h-5 w-5" />Créer mon compte</span>}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-lamanne-accent font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © {new Date().getFullYear()} LAMANNE — Côte d&apos;Ivoire
        </p>
      </div>
    </div>
  );
}
