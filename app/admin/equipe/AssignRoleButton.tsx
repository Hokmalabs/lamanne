"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, ApiClientError } from "@/lib/api-client";

const ROLE_LABELS: Record<string, string> = {
  user: "Client",
  commercial: "Commercial",
  admin: "Admin",
};

export default function AssignRoleButton({
  memberId,
  memberRole,
  currentRole,
}: {
  memberId: string;
  memberRole: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  // Un admin ne peut pas nommer d'admin : le serveur le refuse aussi
  const options =
    currentRole === "super_admin"
      ? ["user", "commercial", "admin"]
      : ["user", "commercial"];

  const handleSelect = (newRole: string) => {
    setError(null);
    if (newRole === memberRole) {
      setPendingRole(null);
      return;
    }
    // Rien n'est appliqué tant que le changement n'est pas confirmé
    setPendingRole(newRole);
  };

  const handleConfirm = async () => {
    if (!pendingRole) return;
    setLoading(true);
    setError(null);
    try {
      await apiPatch(`/api/admin/equipe/${memberId}`, { role: pendingRole });
      setPendingRole(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiClientError ? e.message : "Erreur lors du changement de rôle.",
      );
      setPendingRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <select
        // Le select reflète toujours le rôle réel, jamais le choix en attente
        value={pendingRole ?? memberRole}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={loading}
        aria-label="Changer le rôle du membre"
        className="min-h-[44px] text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-lamanne-primary/30 disabled:opacity-50"
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>

      {pendingRole && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-600">Passer en {ROLE_LABELS[pendingRole]} ?</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-11 min-w-11 px-2 font-semibold text-lamanne-primary disabled:opacity-50"
          >
            {loading ? "…" : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={() => setPendingRole(null)}
            disabled={loading}
            className="h-11 min-w-11 px-2 text-gray-500 disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-lamanne-danger max-w-[16rem]">
          {error}
        </p>
      )}
    </div>
  );
}
