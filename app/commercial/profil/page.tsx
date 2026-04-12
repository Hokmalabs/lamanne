"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, Phone, Mail, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommercialProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    phone: string | null;
    email: string | null;
    role: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, role")
        .eq("id", user.id)
        .single();

      setProfile({
        full_name: data?.full_name ?? null,
        phone: data?.phone ?? null,
        email: user.email ?? null,
        role: data?.role ?? null,
      });
      setLoading(false);
    }
    load();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-[#0D3B8C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = (profile?.full_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Mon profil</h1>
        <p className="text-gray-400 text-sm mt-0.5">Informations de votre compte</p>
      </div>

      {/* Avatar + name */}
      <div className="bg-[#0D3B8C] rounded-2xl p-6 flex items-center gap-4" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-xl">{initials}</span>
        </div>
        <div>
          <p className="text-white font-black text-xl">{profile?.full_name ?? "—"}</p>
          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1">
            <Shield className="h-3 w-3" />
            Commercial
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50" style={{ boxShadow: "var(--shadow-sm)" }}>
        {profile?.phone && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
              <Phone className="h-4 w-4 text-[#0D3B8C]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Téléphone</p>
              <p className="font-semibold text-gray-900">{profile.phone}</p>
            </div>
          </div>
        )}
        {profile?.email && !profile.email.startsWith("phone_") && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-[#0D3B8C]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="font-semibold text-gray-900">{profile.email}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-[#E8F1FB] flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-[#0D3B8C]" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Rôle</p>
            <p className="font-semibold text-gray-900 capitalize">{profile?.role ?? "commercial"}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-12 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-semibold"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Se déconnecter
      </Button>
    </div>
  );
}
