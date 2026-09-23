import { supabaseAdmin } from "@/lib/supabase-admin";
import AddMemberButton from "./AddMemberButton";
import EquipeTableWithSearch from "./EquipeTableWithSearch";
import { requirePageAuth } from "@/lib/api-security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminEquipePage() {
  const ctx = await requirePageAuth(["admin", "super_admin"]);

  const { data: team, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, phone, role, created_at, is_suspended")
    .in("role", ["super_admin", "admin", "commercial"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: false });

  const members = team ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-sora text-2xl font-black text-gray-900">Équipe</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {error
              ? "Liste indisponible"
              : `${members.length} membre(s) de l'équipe`}
          </p>
        </div>
        <div className="w-full sm:w-auto flex-shrink-0 [&>button]:w-full [&>button]:justify-center sm:[&>button]:w-auto">
          <AddMemberButton currentRole={ctx.profile.role} />
        </div>
      </div>

      {error ? (
        // Une liste vide laisserait croire qu'il n'y a aucun membre
        <div
          role="alert"
          className="rounded-xl bg-lamanne-danger/10 text-lamanne-danger text-sm px-4 py-3"
        >
          Impossible de charger l&apos;équipe. Rechargez la page ou réessayez plus tard.
        </div>
      ) : (
        <EquipeTableWithSearch
          members={members}
          currentUserId={ctx.user.id}
          currentRole={ctx.profile.role}
        />
      )}
    </div>
  );
}
