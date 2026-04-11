"use client";

import { useState } from "react";
import { Search, UserCog } from "lucide-react";
import AssignRoleButton from "./AssignRoleButton";
import MemberActions from "./MemberActions";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin",  color: "bg-purple-100 text-purple-700" },
  admin:       { label: "Admin",        color: "bg-red-100 text-red-700" },
  commercial:  { label: "Commercial",   color: "bg-blue-100 text-blue-700" },
  user:        { label: "Client",       color: "bg-gray-100 text-gray-600" },
};

type Member = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  is_suspended: boolean | null;
};

type RoleFilter = "all" | "admin" | "commercial";

export default function EquipeTableWithSearch({ members }: { members: Member[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const filtered = members.filter((m) => {
    if (roleFilter === "admin" && !["admin", "super_admin"].includes(m.role)) return false;
    if (roleFilter === "commercial" && m.role !== "commercial") return false;
    if (search) {
      const s = search.toLowerCase();
      if (!m.full_name?.toLowerCase().includes(s) && !m.phone?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <>
      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {(["all", "admin", "commercial"] as RoleFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                roleFilter === f
                  ? "bg-lamanne-primary text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {f === "all" ? "Tous" : f === "admin" ? "Admins" : "Commerciaux"}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserCog className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Aucun membre trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Membre</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Téléphone</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Rôle</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Depuis</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-500">Statut</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const roleInfo = ROLE_LABELS[m.role] ?? ROLE_LABELS.user;
                return (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-gray-600 text-xs">
                            {m.full_name?.charAt(0).toUpperCase() ?? "?"}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{m.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{m.phone ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(m.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      {m.is_suspended ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                          Suspendu
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-600">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <AssignRoleButton memberId={m.id} currentRole={m.role} />
                        <MemberActions memberId={m.id} isSuspended={!!m.is_suspended} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
