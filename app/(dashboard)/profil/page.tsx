"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  LogOut,
  Edit3,
  Check,
  X,
} from "lucide-react";

const mockUser = {
  full_name: "Kouassi Ama Marie",
  email: "ama.kouassi@exemple.com",
  phone: "+225 07 12 34 56 78",
  created_at: "2024-01-15",
};

export default function ProfilPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: mockUser.full_name,
    phone: mockUser.phone,
  });

  const initials = mockUser.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSave = async () => {
    setSaving(true);
    // Simulation sauvegarde
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* En-tête */}
      <h1 className="text-2xl font-black text-gray-900">Mon profil</h1>

      {/* Carte profil */}
      <div className="bg-lamanne-primary rounded-2xl p-6 text-center">
        <Avatar className="h-20 w-20 mx-auto mb-4 border-4 border-white/20">
          <AvatarFallback className="text-xl font-black bg-lamanne-accent text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-black text-white">{mockUser.full_name}</h2>
        <p className="text-white/60 text-sm mt-1">Membre depuis janvier 2024</p>
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
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm text-lamanne-accent font-semibold hover:opacity-80 transition-opacity"
            >
              <Edit3 className="h-4 w-4" />
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

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
                onClick={() => setIsEditing(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
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
              { icon: User, label: "Nom complet", value: mockUser.full_name },
              { icon: Mail, label: "Adresse e-mail", value: mockUser.email },
              { icon: Phone, label: "Téléphone", value: mockUser.phone },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-lamanne-light rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-lamanne-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-900 mb-4">Mes statistiques</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { value: "4", label: "Cotisations" },
            { value: "2", label: "En cours" },
            { value: "2", label: "Terminées" },
          ].map((stat) => (
            <div key={stat.label} className="bg-lamanne-light rounded-xl py-3">
              <p className="text-xl font-black text-lamanne-primary">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
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
