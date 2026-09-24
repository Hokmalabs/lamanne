"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { normalizeCIPhone, PHONE_FORMAT_MESSAGE } from "@/lib/phone";
import { PIN_LENGTH, pinProblem } from "@/lib/pin-rules";
import { apiPost, ApiClientError } from "@/lib/api-client";

const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, PIN_LENGTH);

type RegisterResponse = { ok: true; session: boolean };

function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = normalizeCIPhone(phone);
  const pinIssue = pin.length === PIN_LENGTH ? pinProblem(pin, normalizedPhone ?? undefined) : null;
  const pinMismatch = pinConfirm.length === PIN_LENGTH && pinConfirm !== pin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = fullName.trim();
    if (name.length < 2 || name.length > 100) {
      setError("Le nom doit contenir entre 2 et 100 caractères.");
      return;
    }
    if (!normalizedPhone) {
      setError(PHONE_FORMAT_MESSAGE);
      return;
    }
    const problem = pinProblem(pin, normalizedPhone);
    if (problem) {
      setError(problem);
      return;
    }
    if (pin !== pinConfirm) {
      setError("Les deux codes doivent être identiques.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost<RegisterResponse>("/api/auth/register-phone", {
        full_name: name,
        phone: phone.trim(),
        pin,
      });
      setPin("");
      setPinConfirm("");

      if (res.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login?registered=1");
      }
    } catch (err) {
      setPin("");
      setPinConfirm("");
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Création du compte impossible. Vérifiez votre réseau.",
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lamanne-primary to-lamanne-accent flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <Logo size={48} />
            <span className="font-sora text-white font-black text-2xl tracking-wide">LAMANNE</span>
            <span className="text-white/60 text-sm">Rejoignez-nous gratuitement</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="font-sora text-2xl font-black text-gray-900">Créer un compte</h2>
            <p className="text-gray-500 text-sm mt-1">
              Commencez à cotiser pour vos articles préférés.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Kouassi Ama Marie"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
                style={{ fontSize: "16px" }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07 00 00 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-gray-400">10 chiffres</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pin">Code PIN (6 chiffres)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PIN_LENGTH}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(onlyDigits(e.target.value))}
                required
                className="text-center tracking-[0.5em]"
                style={{ fontSize: "24px" }}
              />
              {pinIssue ? (
                <p className="text-xs text-lamanne-danger">{pinIssue}</p>
              ) : (
                <p className="text-xs text-gray-400">
                  Ce code vous servira à vous connecter. Évitez les suites et les répétitions.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pin-confirm">Confirmez le code PIN</Label>
              <Input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={PIN_LENGTH}
                placeholder="••••••"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(onlyDigits(e.target.value))}
                required
                className="text-center tracking-[0.5em]"
                style={{ fontSize: "24px" }}
              />
              {pinMismatch && (
                <p className="text-xs text-lamanne-danger">Les deux codes doivent être identiques.</p>
              )}
            </div>

            <div className="flex gap-2 rounded-xl bg-lamanne-soft p-3">
              <ShieldCheck className="h-4 w-4 text-lamanne-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-800">
                Votre numéro et votre code PIN sont vos identifiants. Ne communiquez jamais
                votre code, même à un agent.
              </p>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading
                ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                : <span className="flex items-center gap-2"><Phone className="h-5 w-5" />Créer mon compte</span>}
            </Button>
          </form>

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

export default function RegisterPage() {
  return <RegisterForm />;
}
