"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X } from "lucide-react";

export default function AddClientModal({ commercialId }: { commercialId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const reset = () => { setFullName(""); setPhone(""); setPin(""); setError(null); };
  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        phone,
        pin,
        role: "user",
        assigned_commercial: commercialId,
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
        Ajouter un client
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">Nouveau client</h2>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100">
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
                <Label htmlFor="ac-name">Nom complet</Label>
                <Input id="ac-name" placeholder="Kouassi Ama" value={fullName}
                  onChange={(e) => setFullName(e.target.value)} required style={{ fontSize: "16px" }} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ac-phone">Téléphone</Label>
                <Input id="ac-phone" type="tel" placeholder="+225 07 00 00 00 00" value={phone}
                  onChange={(e) => setPhone(e.target.value)} required style={{ fontSize: "16px" }} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ac-pin">Code PIN (4 chiffres)</Label>
                <Input id="ac-pin" type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  required className="text-center text-2xl tracking-[0.5em]" style={{ fontSize: "24px" }} />
                <p className="text-xs text-gray-400">Le client se connectera avec ce PIN.</p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
                <Button type="submit" className="flex-1" disabled={loading || pin.length !== 4}>
                  {loading
                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
                    : "Créer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
