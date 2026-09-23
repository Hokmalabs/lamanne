"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PauseCircle, PlayCircle, Trash2, KeyRound } from "lucide-react";
import { apiPost, apiDelete, ApiClientError } from "@/lib/api-client";
import PasswordRevealDialog from "./PasswordRevealDialog";

type PendingConfirm = "delete" | "password" | null;

export default function MemberActions({
  memberId,
  memberName,
  memberRole,
  isSuspended,
  currentRole,
  loginHint,
}: {
  memberId: string;
  memberName: string;
  memberRole: string;
  isSuspended: boolean;
  currentRole: string;
  loginHint: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PendingConfirm>(null);

  // Secret affiché une seule fois : vidé à la fermeture du dialog
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const canDelete = currentRole === "super_admin";

  const handleSuspendToggle = async () => {
    const action = isSuspended ? "reactivate" : "suspend";
    setLoading(action);
    setError(null);
    try {
      await apiPost("/api/admin/equipe/suspend", { member_id: memberId, action });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau");
    } finally {
      setLoading(null);
    }
  };

  const handleRegeneratePassword = async () => {
    setLoading("password");
    setError(null);
    try {
      const result = await apiPost<{ ok: true; password: string }>(
        `/api/admin/equipe/${memberId}/password`,
        {},
      );
      setConfirming(null);
      setNewPassword(result.password);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau");
      setConfirming(null);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    setError(null);
    try {
      await apiDelete(`/api/admin/equipe/${memberId}`);
      setConfirming(null);
      router.refresh();
    } catch (e) {
      // 409 : « Ce compte a un historique : suspendez-le plutôt »
      setError(e instanceof ApiClientError ? e.message : "Erreur réseau");
      setConfirming(null);
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordDialogClose = () => {
    setNewPassword(null);
    router.refresh();
  };

  const busy = loading !== null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2 justify-end flex-wrap">
        {isSuspended ? (
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-w-11 text-xs text-lamanne-success border-lamanne-success/30 hover:bg-lamanne-success/10 hover:text-lamanne-success"
            onClick={handleSuspendToggle}
            disabled={busy}
            title="Réactiver le compte"
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            {loading === "reactivate" ? "…" : "Réactiver"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-w-11 text-xs text-lamanne-warning border-lamanne-warning/30 hover:bg-lamanne-warning/10 hover:text-lamanne-warning"
            onClick={handleSuspendToggle}
            disabled={busy}
            title="Suspendre le compte"
          >
            <PauseCircle className="h-4 w-4 mr-1" />
            {loading === "suspend" ? "…" : "Suspendre"}
          </Button>
        )}

        {confirming !== "password" && (
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-w-11 text-xs"
            onClick={() => { setError(null); setConfirming("password"); }}
            disabled={busy}
            aria-label="Nouveau mot de passe"
            title="Nouveau mot de passe"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        )}

        {canDelete && confirming !== "delete" && (
          <Button
            size="sm"
            variant="outline"
            className="h-11 min-w-11 text-xs text-lamanne-danger border-lamanne-danger/30 hover:bg-lamanne-danger/10 hover:text-lamanne-danger"
            onClick={() => { setError(null); setConfirming("delete"); }}
            disabled={busy}
            aria-label={`Supprimer ${memberName}`}
            title="Supprimer le compte"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {confirming === "password" && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap justify-end">
          <span className="text-gray-600 text-right">
            Générer un nouveau mot de passe ? L&apos;ancien ne fonctionnera plus.
          </span>
          <button
            type="button"
            onClick={handleRegeneratePassword}
            disabled={busy}
            className="h-11 min-w-11 px-2 font-semibold text-lamanne-primary disabled:opacity-50"
          >
            {loading === "password" ? "…" : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={busy}
            className="h-11 min-w-11 px-2 text-gray-500 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {confirming === "delete" && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap justify-end">
          <span className="text-gray-600 text-right">
            Supprimer définitivement {memberName} (
            {memberRole === "admin" ? "administrateur" : "commercial"}) ?
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="h-11 min-w-11 px-2 font-semibold text-lamanne-danger disabled:opacity-50"
          >
            {loading === "delete" ? "…" : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={busy}
            className="h-11 min-w-11 px-2 text-gray-500 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-lamanne-danger max-w-[18rem] text-right">
          {error}
        </p>
      )}

      <PasswordRevealDialog
        open={newPassword !== null}
        memberName={memberName}
        password={newPassword ?? ""}
        loginHint={loginHint}
        onClose={handlePasswordDialogClose}
      />
    </div>
  );
}
