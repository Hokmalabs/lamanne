"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { PIN_LENGTH, pinProblem } from "@/lib/pin-rules";
import {
  User,
  Mail,
  Phone,
  LogOut,
  Edit3,
  Check,
  X,
  CalendarDays,
  KeyRound,
} from "lucide-react";

interface ProfileData {
  full_name: string;
  phone: string;
  created_at: string;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "").slice(0, PIN_LENGTH);

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  // Changement de PIN : les codes ne vivent que dans ce state, vidé après usage
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoadError("Impossible de charger votre profil. Reconnectez-vous puis réessayez.");
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, created_at")
        .eq("id", user.id)
        .single();

      if (profileError || !data) {
        setLoadError("Impossible de charger votre profil. Réessayez dans un instant.");
      } else {
        setProfile(data);
        setNameDraft(data.full_name ?? "");
      }
      setLoading(false);
    }

    loadProfile();
  }, []);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  // Les comptes sans email réel ont un identifiant technique : on ne l'affiche pas
  const displayEmail = email && !email.startsWith("phone_") ? email : null;

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setNameDraft(profile?.full_name ?? "");
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);

    const name = nameDraft.trim();
    if (name.length < 2 || name.length > 100) {
      setError("Le nom doit contenir entre 2 et 100 caractères.");
      return;
    }

    setSaving(true);
    try {
      await apiPatch("/api/client/profil", { full_name: name });
      setProfile((prev) => (prev ? { ...prev, full_name: name } : prev));
      setSuccessMsg("Profil mis à jour avec succès.");
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Erreur lors de la sauvegarde. Veuillez réessayer.",
      );
    } finally {
      setSaving(false);
    }
  };

  const newPinIssue =
    newPin.length === PIN_LENGTH ? pinProblem(newPin, profile?.phone || undefined) : null;
  const newPinMismatch = newPinConfirm.length === PIN_LENGTH && newPinConfirm !== newPin;
  const canSubmitPin =
    currentPin.length === PIN_LENGTH &&
    newPin.length === PIN_LENGTH &&
    !newPinIssue &&
    newPinConfirm === newPin;

  const clearPins = () => {
    setCurrentPin("");
    setNewPin("");
    setNewPinConfirm("");
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!canSubmitPin) {
      setPinError(newPinIssue ?? "Vérifiez les codes saisis (6 chiffres, confirmation identique).");
      return;
    }

    setPinSaving(true);
    try {
      await apiPost("/api/client/pin", { current_pin: currentPin, new_pin: newPin });
      setPinSuccess("Votre code PIN a été modifié. Utilisez-le dès votre prochaine connexion.");
    } catch (err) {
      setPinError(
        err instanceof ApiClientError
          ? err.message
          : "Modification impossible. Vérifiez votre réseau.",
      );
    } finally {
      clearPins();
      setPinSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-lamanne-primary/20 rounded-2xl h-40 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
      </div>
    );
  }

  const logoutCard = (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 mb-4">Compte</h3>
      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Se déconnecter
      </Button>
    </div>
  );

  if (loadError || !profile) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <h1 className="font-sora text-2xl font-black text-gray-900">Mon profil</h1>
        <div
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          {loadError ?? "Profil introuvable."}
        </div>
        {logoutCard}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* En-tête */}
      <h1 className="font-sora text-2xl font-black text-gray-900">Mon profil</h1>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Carte profil */}
      <div className="bg-lamanne-primary rounded-2xl p-6 flex items-center gap-4">
        <Avatar className="h-16 w-16 flex-shrink-0 border-4 border-white/20">
          <AvatarFallback className="font-sora text-xl font-black bg-white/20 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="font-sora text-xl font-black text-white truncate">
            {profile.full_name || "—"}
          </h2>
          {profile.created_at && (
            <p className="text-white/60 text-sm mt-1">
              Membre depuis {formatDate(profile.created_at)}
            </p>
          )}
          <div className="mt-3 inline-flex items-center gap-2 bg-white/15 text-white text-sm px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-lamanne-success rounded-full" />
            Compte actif
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Informations personnelles</h3>
          {!isEditing ? (
            <button
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 text-sm text-lamanne-accent font-semibold hover:opacity-80 transition-opacity"
            >
              <Edit3 className="h-4 w-4" />
              Modifier
            </button>
          ) : (
            <button
              onClick={cancelEdit}
              aria-label="Annuler la modification"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={nameDraft}
                maxLength={100}
                onChange={(e) => setNameDraft(e.target.value)}
                style={{ fontSize: "16px" }}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">Téléphone</p>
              <p className="text-sm font-semibold text-gray-900">{profile.phone || "—"}</p>
              <p className="text-xs text-gray-400">
                Pour changer de numéro, contactez votre agent.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={cancelEdit}>
                Annuler
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sauvegarde...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Sauvegarder
                  </span>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { icon: User, label: "Nom complet", value: profile.full_name || "—", note: null },
              ...(displayEmail
                ? [{ icon: Mail, label: "Adresse e-mail", value: displayEmail, note: null }]
                : []),
              {
                icon: Phone,
                label: "Téléphone",
                value: profile.phone || "—",
                note: "Pour changer de numéro, contactez votre agent.",
              },
              {
                icon: CalendarDays,
                label: "Membre depuis",
                value: profile.created_at ? formatDate(profile.created_at) : "—",
                note: null,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-lamanne-soft rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-lamanne-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.value}
                    </p>
                    {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Code PIN */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-lamanne-primary" />
          <h3 className="font-bold text-gray-900">Mon code PIN</h3>
        </div>

        {pinSuccess && (
          <div
            role="status"
            className="mb-4 rounded-xl bg-lamanne-success/10 text-lamanne-success text-sm px-4 py-3"
          >
            {pinSuccess}
          </div>
        )}
        {pinError && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
          >
            {pinError}
          </div>
        )}

        <form onSubmit={handlePinChange} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pin">Code actuel</Label>
            <Input
              id="current-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={PIN_LENGTH}
              placeholder="••••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
              required
              className="text-center tracking-[0.5em]"
              style={{ fontSize: "20px" }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pin">Nouveau code</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={PIN_LENGTH}
              placeholder="••••••"
              value={newPin}
              onChange={(e) => setNewPin(onlyDigits(e.target.value))}
              required
              className="text-center tracking-[0.5em]"
              style={{ fontSize: "20px" }}
            />
            {newPinIssue ? (
              <p className="text-xs text-lamanne-danger">{newPinIssue}</p>
            ) : (
              <p className="text-xs text-gray-400">6 chiffres, sans suite ni répétition.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pin-confirm">Confirmez le nouveau code</Label>
            <Input
              id="new-pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={PIN_LENGTH}
              placeholder="••••••"
              value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(onlyDigits(e.target.value))}
              required
              className="text-center tracking-[0.5em]"
              style={{ fontSize: "20px" }}
            />
            {newPinMismatch && (
              <p className="text-xs text-lamanne-danger">Les deux codes doivent être identiques.</p>
            )}
          </div>
          <Button type="submit" className="w-full min-h-[44px]" disabled={pinSaving || !canSubmitPin}>
            {pinSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Modification...
              </span>
            ) : (
              "Changer mon code"
            )}
          </Button>
        </form>
      </div>

      {/* Déconnexion */}
      {logoutCard}
    </div>
  );
}
