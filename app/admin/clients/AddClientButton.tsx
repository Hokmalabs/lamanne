"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, CheckCircle, ChevronDown } from "lucide-react";

interface Commercial {
  id: string;
  full_name: string;
}

export default function AddClientButton({ commercials }: { commercials: Commercial[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedCommercial, setAssignedCommercial] = useState("");

  const reset = () => {
    setFullName(""); setPhone(""); setAssignedCommercial("");
    setError(null); setSuccess(false);
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
        assigned_commercial: assignedCommercial || undefined,
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
      <Button onClick={() => setOpen(true)} size="sm" className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Créer un compte client
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            {success ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">Client créé !</p>
                <p className="text-sm text-gray-500 mt-1">{fullName} a été ajouté avec succès.</p>
              </div>
            ) : (
              <>
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

                  <p className="text-xs text-gray-400">
                    Un code d&apos;accès est généré automatiquement pour ce client.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1" disabled={loading}>
                      {loading
                        ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</span>
                        : "Créer le compte"}
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
