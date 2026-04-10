"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "user",        label: "Client" },
  { value: "commercial",  label: "Commercial" },
  { value: "admin",       label: "Admin" },
];

export default function AssignRoleButton({
  memberId,
  currentRole,
}: {
  memberId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChange = async (newRole: string) => {
    if (newRole === currentRole) return;
    setLoading(true);
    const res = await fetch(`/api/admin/equipe/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Erreur lors de la mise à jour du rôle.");
    }
  };

  if (currentRole === "super_admin") {
    return <span className="text-xs text-gray-300">Intouchable</span>;
  }

  return (
    <select
      value={currentRole}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-lamanne-primary/30 disabled:opacity-50"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}
