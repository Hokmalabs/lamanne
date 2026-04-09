"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  LogOut,
  Edit3,
  Check,
  X,
  CalendarDays,
} from "lucide-react";

interface ProfileData {
  full_name: string;
  phone: string;
  created_at: string;
}

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [email, setEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    async function fetchProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, created_at")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name, phone: data.phone });
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, phone: form.phone })
      .eq("id", user.id);

    if (updateError) {
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } else {
      setProfile((prev) =>
        prev ? { ...prev, full_name: form.full_name, phone: form.phone } : prev
      );
      setSuccessMsg("Profil mis à jour avec succès.");
      setIsEditing(false);
    }

    setSaving(false);
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

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* En-tête */}
      <h1 className="text-2xl font-black text-gray-900">Mon profil</h1>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          {successMsg}
        </div>
      )}

      {/* Carte profil */}
      <div className="bg-lamanne-primary rounded-2xl p-6 text-center">
        <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-white/20">
          <AvatarFallback className="text-xl font-black bg-lamanne-accent text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-black text-white">
          {profile?.full_name || "—"}
        </h2>
        {profile?.created_at && (
          <p className="text-white/60 text-sm mt-1">
            Membre depuis {formatDate(profile.created_at)}
          </p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 bg-white/15 text-white text-sm px-4 py-2 rounded-full">
          <span className="w-2 h-2 bg-lamanne-success rounded-full" />
          Compte actif
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
              onClick={() => {
                setIsEditing(false);
                setForm({
                  full_name: profile?.full_name ?? "",
                  phone: profile?.phone ?? "",
                });
              }}
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
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditing(false);
                  setForm({
                    full_name: profile?.full_name ?? "",
                    phone: profile?.phone ?? "",
                  });
                }}
              >
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
              { icon: User, label: "Nom complet", value: profile?.full_name || "—" },
              { icon: Mail, label: "Adresse e-mail", value: email || "—" },
              { icon: Phone, label: "Téléphone", value: profile?.phone || "—" },
              {
                icon: CalendarDays,
                label: "Membre depuis",
                value: profile?.created_at ? formatDate(profile.created_at) : "—",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-lamanne-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Déconnexion */}
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
    </div>
  );
}
