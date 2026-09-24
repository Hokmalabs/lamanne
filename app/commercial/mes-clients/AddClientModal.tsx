"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X } from "lucide-react";
import SecretRevealDialog from "@/components/SecretRevealDialog";
import { apiPost, ApiClientError } from "@/lib/api-client";

type CreateClientResponse = { ok: true; client_id: string; temp_pin: string };

/** Code d'accès à remettre : ne vit que dans ce state, vidé à la fermeture */
type Reveal = { name: string; phone: string; pin: string };

export default function AddClientModal({ commercialId, fab }: { commercialId: string; fab?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const reset = () => { setFullName(""); setPhone(""); setError(null); };
  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiPost<CreateClientResponse>("/api/commercial/register-client", {
        full_name: fullName,
        phone,
      });
      const created: Reveal = { name: fullName.trim(), phone: phone.trim(), pin: res.temp_pin };
      handleClose();
      setReveal(created);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevealClose = () => {
    router.refresh();
    setReveal(null);
  };

  return (
    <>
      {fab ? (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-lamanne-primary text-white flex items-center justify-center shadow-lg hover:bg-lamanne-primary/90 transition-all active:scale-95"
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
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[calc(100vh-3rem)] overflow-y-auto my-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-sora text-lg font-black text-gray-900">Nouveau client</h2>
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
                <Input id="ac-phone" type="tel" placeholder="07 00 00 00 00" value={phone}
                  onChange={(e) => setPhone(e.target.value)} required style={{ fontSize: "16px" }} />
                <p className="text-xs text-gray-400">10 chiffres</p>
              </div>

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Annuler</Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading
                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span>
                    : "Créer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SecretRevealDialog
        open={reveal !== null}
        title={`Code d'accès de ${reveal?.name ?? ""}`}
        secret={reveal?.pin ?? ""}
        hint={`Connexion : onglet Téléphone, numéro ${reveal?.phone ?? ""}. Code valable 7 jours.`}
        warning="Remettez ce code au client en main propre. À sa première connexion, il devra choisir son propre code."
        confirmLabel="J'ai remis le code"
        onClose={handleRevealClose}
      />
    </>
  );
}
