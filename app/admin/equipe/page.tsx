import { createClient } from "@supabase/supabase-js";
import { UserCog } from "lucide-react";
import AssignRoleButton from "./AssignRoleButton";
import AddMemberButton from "./AddMemberButton";
import MemberActions from "./MemberActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: "Super Admin",  color: "bg-purple-100 text-purple-700" },
  admin:       { label: "Admin",        color: "bg-red-100 text-red-700" },
  commercial:  { label: "Commercial",   color: "bg-blue-100 text-blue-700" },
  user:        { label: "Client",       color: "bg-gray-100 text-gray-600" },
};

export default async function AdminEquipePage() {
  const { data: team } = await admin
    .from("profiles")
    .select("id, full_name, phone, role, created_at, is_suspended")
    .in("role", ["super_admin", "admin", "commercial"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: false });

  const members = team ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Équipe</h1>
          <p className="text-gray-500 text-sm mt-0.5">{members.length} membre(s) de l&apos;équipe</p>
        </div>
        <AddMemberButton />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserCog className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Aucun membre dans l&apos;équipe</p>
            <p className="text-sm mt-1">Promouvez un client en commercial ou admin.</p>
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
              {members.map((m) => {
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

    </div>
  );
}
