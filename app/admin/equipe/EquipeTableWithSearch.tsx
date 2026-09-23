"use client";

import { useState } from "react";
import { Search, UserCog } from "lucide-react";
import AssignRoleButton from "./AssignRoleButton";
import MemberActions from "./MemberActions";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin",  color: "bg-purple-100 text-purple-700" },
  admin:       { label: "Admin",        color: "bg-lamanne-soft text-lamanne-primary" },
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

export default function EquipeTableWithSearch({
  members,
  currentUserId,
  currentRole,
}: {
  members: Member[];
  currentUserId: string;
  currentRole: string;
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Miroir UI de loadManageableTarget — le serveur reste l'autorité
  const canManage = (member: Member) =>
    member.id !== currentUserId &&
    member.role !== "super_admin" &&
    (currentRole === "super_admin" || member.role === "commercial");

  const loginHintFor = (member: Member) =>
    `Connexion : onglet Téléphone, avec le numéro ${member.phone ?? "—"}`;

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
        <div className="flex gap-2 flex-wrap">
          {(["all", "admin", "commercial"] as RoleFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`inline-flex items-center min-h-[44px] px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher un membre"
            className="min-h-[44px] pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-lamanne-primary/20 w-full sm:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400" style={{ boxShadow: "var(--shadow-sm)" }}>
          <UserCog className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Aucun membre trouvé</p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((m) => {
              const roleInfo = ROLE_LABELS[m.role] ?? ROLE_LABELS.user;
              const manageable = canManage(m);
              return (
                <div key={m.id} className="bg-white rounded-2xl p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-gray-600 text-sm">
                        {m.full_name?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{m.full_name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{m.phone ?? "—"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${m.is_suspended ? "bg-lamanne-danger/10 text-lamanne-danger" : "bg-lamanne-success/10 text-lamanne-success"}`}>
                      {m.is_suspended ? "Suspendu" : "Actif"}
                    </span>
                    {manageable ? (
                      <div className="flex flex-col items-end gap-2">
                        <AssignRoleButton
                          memberId={m.id}
                          memberRole={m.role}
                          currentRole={currentRole}
                        />
                        <MemberActions
                          memberId={m.id}
                          memberName={m.full_name ?? "ce membre"}
                          memberRole={m.role}
                          isSuspended={!!m.is_suspended}
                          currentRole={currentRole}
                          loginHint={loginHintFor(m)}
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
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
                  const manageable = canManage(m);
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-lamanne-danger/10 text-lamanne-danger">Suspendu</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-lamanne-success/10 text-lamanne-success">Actif</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {manageable ? (
                          <div className="flex items-start gap-3 justify-end">
                            <AssignRoleButton
                              memberId={m.id}
                              memberRole={m.role}
                              currentRole={currentRole}
                            />
                            <MemberActions
                              memberId={m.id}
                              memberName={m.full_name ?? "ce membre"}
                              memberRole={m.role}
                              isSuspended={!!m.is_suspended}
                              currentRole={currentRole}
                              loginHint={loginHintFor(m)}
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
