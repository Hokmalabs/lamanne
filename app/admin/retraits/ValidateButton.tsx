"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackageCheck, X, KeyRound, IdCard } from "lucide-react";
import { apiPatch, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Method = "code" | "identite";
type Proof = "carnet" | "piece_identite";

export function ValidateButton({
  id,
  clientName,
  clientPhone,
  productName,
}: {
  id: string;
  clientName: string;
  clientPhone: string | null;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("code");
  const [code, setCode] = useState("");
  const [clientPresent, setClientPresent] = useState(false);
  const [proof, setProof] = useState<Proof | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !loading &&
    (method === "code" ? /^\d{6}$/.test(code) : clientPresent && proof !== null);

  const reset = () => {
    setMethod("code");
    setCode("");
    setClientPresent(false);
    setProof(null);
    setError(null);
  };

  const handleOpen = () => {
    reset();
    setOpen(true);
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
  };

  const switchMethod = (m: Method) => {
    setMethod(m);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const body =
        method === "code"
          ? { method: "code" as const, code }
          : { method: "identite" as const, proof, client_present: true as const };
      await apiPatch(`/api/admin/retraits/${id}`, body);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button className="w-full" onClick={handleOpen}>
        <span className="flex items-center gap-2">
          <PackageCheck className="h-4 w-4 flex-shrink-0" />
          Valider le retrait
        </span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10 max-h-[calc(100vh-3rem)] overflow-y-auto my-auto space-y-5">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-sora font-black text-gray-900">Valider le retrait</h2>
                <p className="text-sm font-semibold text-gray-900 mt-2 truncate">{clientName}</p>
                {clientPhone && <p className="text-xs text-gray-500">{clientPhone}</p>}
                <p className="text-sm text-gray-500 truncate">{productName}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 flex-shrink-0"
                aria-label="Fermer"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Onglets */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {([
                { key: "code" as Method, label: "Code du client", Icon: KeyRound },
                { key: "identite" as Method, label: "Vérification d'identité", Icon: IdCard },
              ]).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchMethod(key)}
                  disabled={loading}
                  className={cn(
                    "flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all",
                    method === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-3 py-2">
                {error}
              </div>
            )}

            {method === "code" ? (
              <div className="space-y-1.5">
                <Label htmlFor={`code-${id}`}>Code de retrait</Label>
                <Input
                  id={`code-${id}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center font-sora font-black tracking-[0.5em]"
                  style={{ fontSize: "16px" }}
                  placeholder="••••••"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Demandez au client le code reçu dans son application.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clientPresent}
                    onChange={(e) => setClientPresent(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 accent-lamanne-primary flex-shrink-0"
                  />
                  <span>
                    Le client est présent et son numéro{" "}
                    <strong className="text-gray-900">{clientPhone ?? "—"}</strong> est vérifié
                  </span>
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-gray-900 mb-2">Preuve présentée</legend>
                  {([
                    { key: "carnet" as Proof, label: "Carnet de cotisation" },
                    { key: "piece_identite" as Proof, label: "Pièce d'identité" },
                  ]).map(({ key, label }) => (
                    <label
                      key={key}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-colors",
                        proof === key
                          ? "border-lamanne-primary bg-lamanne-primary/5 text-gray-900"
                          : "border-gray-200 text-gray-700 hover:border-gray-300",
                      )}
                    >
                      <input
                        type="radio"
                        name={`proof-${id}`}
                        value={key}
                        checked={proof === key}
                        onChange={() => setProof(key)}
                        disabled={loading}
                        className="h-4 w-4 accent-lamanne-primary"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>
            )}

            <Button className="w-full h-11 font-bold" onClick={handleConfirm} disabled={!canSubmit}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  Validation...
                </span>
              ) : (
                "Confirmer le retrait"
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
