"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, CheckCircle } from "lucide-react";

export default function AddClientModal({ commercialId, fab }: { commercialId: string; fab?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const reset = () => { setFullName(""); setPhone(""); setError(null); setSuccess(false); };
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

    setSuccess(true);
    setTimeout(() => {
      handleClose();
      router.refresh();
    }, 1500);
  };

  return (
    <>
      {fab ? (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-[#0D3B8C] text-white flex items-center justify-center shadow-lg hover:bg-[#0D3B8C]/90 transition-all active:scale-95"
          aria-label="Ajouter un client"
        >
          <UserPlus className="h-6 w-6" />
        </button>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Ajouter un client
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            {success ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">Client ajouté !</p>
                <p className="text-sm text-gray-500 mt-1">{fullName} est dans votre liste.</p>
              </div>
            ) : (
              <>
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

                  <p className="text-xs text-gray-400">
                    Un code d&apos;accès sera généré automatiquement pour ce client.
                  </p>

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading
                        ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
                        : "Créer"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
