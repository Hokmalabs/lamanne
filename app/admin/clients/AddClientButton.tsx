"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, ChevronDown } from "lucide-react";

interface Commercial {
  id: string;
  full_name: string;
}

export default function AddClientButton({ commercials }: { commercials: Commercial[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [assignedCommercial, setAssignedCommercial] = useState("");

  const reset = () => {
    setFullName(""); setPhone(""); setEmail(""); setPin(""); setAssignedCommercial("");
    setError(null);
  };

  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        email,
        pin,
        assigned_commercial: assignedCommercial || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Erreur lors de la création.");
      return;
    }

    handleClose();
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Créer un compte client
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">Créer un compte client</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-fullname">Nom complet</Label>
                <Input
                  id="c-fullname"
                  placeholder="Adjoua Koffi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Téléphone</Label>
                <Input
                  id="c-phone"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-email">Email (optionnel)</Label>
                <Input
                  id="c-email"
                  type="email"
                  placeholder="laisser vide → connexion par téléphone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ fontSize: "16px" }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-pin">Code PIN (4 chiffres)</Label>
                <Input
                  id="c-pin"
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
                  Le client se connectera avec son numéro + ce PIN.
                </p>
              </div>

              {commercials.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-commercial">Commercial assigné (optionnel)</Label>
                  <div className="relative">
                    <select
                      id="c-commercial"
                      value={assignedCommercial}
                      onChange={(e) => setAssignedCommercial(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10"
                      style={{ fontSize: "16px" }}
                    >
                      <option value="">— Aucun commercial —</option>
                      {commercials.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                  Annuler
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || pin.length !== 4}>
                  {loading
                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                    : "Créer le compte"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
