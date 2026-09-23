"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X, ChevronDown } from "lucide-react";
import { apiPost, ApiClientError } from "@/lib/api-client";
import PasswordRevealDialog from "./PasswordRevealDialog";

type CreatedMember = {
  ok: true;
  member_id: string;
  password: string;
};

export default function AddMemberButton({ currentRole }: { currentRole: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"commercial" | "admin">("commercial");

  // Secret affiché une seule fois : vidé à la fermeture du dialog
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState("");
  const [createdHint, setCreatedHint] = useState("");

  const canCreateAdmin = currentRole === "super_admin";

  const reset = () => {
    setFullName(""); setPhone(""); setEmail(""); setRole("commercial");
    setError(null);
  };

  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim();
    const memberName = fullName.trim();
    const memberPhone = phone.trim();

    try {
      const result = await apiPost<CreatedMember>("/api/admin/equipe", {
        full_name: memberName,
        phone: memberPhone,
        email: trimmedEmail,
        role,
      });

      setCreatedName(memberName);
      setCreatedHint(
        trimmedEmail
          ? `Connexion par email : ${trimmedEmail}`
          : `Connexion : onglet Téléphone, avec le numéro ${memberPhone}`,
      );
      setCreatedPassword(result.password);
      handleClose();
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Erreur lors de la création.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordDialogClose = () => {
    setCreatedPassword(null);
    setCreatedName("");
    setCreatedHint("");
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Ajouter un membre
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 my-auto max-h-[calc(100vh-3rem)] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-sora text-lg font-black text-gray-900">Ajouter un membre</h2>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fermer"
                className="h-11 w-11 -mr-2 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
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
                <Label htmlFor="m-fullname">Nom complet</Label>
                <Input
                  id="m-fullname"
                  placeholder="Kouamé Jean"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-phone">Téléphone</Label>
                <Input
                  id="m-phone"
                  type="tel"
                  placeholder="+225 07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="min-h-[44px] text-base sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-email">Email (optionnel)</Label>
                <Input
                  id="m-email"
                  type="email"
                  placeholder="laisser vide → connexion par téléphone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] text-base sm:text-sm"
                />
                <p className="text-xs text-gray-500">
                  Si un email est renseigné, le membre se connectera avec cet email (et non
                  avec son téléphone).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="m-role">Rôle</Label>
                <div className="relative">
                  <select
                    id="m-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "commercial" | "admin")}
                    className="w-full min-h-[44px] appearance-none border border-gray-200 rounded-xl px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 pr-10 bg-white"
                  >
                    <option value="commercial">Commercial</option>
                    {canCreateAdmin && <option value="admin">Admin</option>}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:flex-1 min-h-[44px]"
                  onClick={handleClose}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 min-h-[44px]"
                  disabled={loading}
                >
                  {loading
                    ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création…</span>
                    : "Créer le compte"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PasswordRevealDialog
        open={createdPassword !== null}
        memberName={createdName}
        password={createdPassword ?? ""}
        loginHint={createdHint}
        onClose={handlePasswordDialogClose}
      />
    </>
  );
}
